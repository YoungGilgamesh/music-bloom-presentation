import * as THREE from 'three'

const shaderPrelude = /* glsl */ `
  uniform float uTime;
  uniform vec3 uViewerPosition;

  attribute vec3 aCenter;
  attribute vec3 aShape;
  attribute vec3 aFlow;
  attribute vec3 aDrift;
  attribute float aProgress;
  attribute float aTone;

  varying float vAlpha;
  varying float vTone;

  vec3 clusterDrift(vec3 drift, float time) {
    float cycle = time * drift.z + drift.y;
    vec2 axis = vec2(cos(drift.x), sin(drift.x));
    vec2 side = vec2(-axis.y, axis.x);
    vec2 horizontal = axis * sin(cycle) * 10.0
      + side * cos(cycle * 0.73 + drift.y) * 4.0;
    float vertical = sin(cycle * 0.61 + drift.y * 1.7) * 10.0;
    return vec3(horizontal.x, vertical, horizontal.y);
  }

  vec3 fluidPath(float progress, vec3 shape, vec3 flow, float motion) {
    float centered = progress - 0.5;
    float arc = centered * 3.6 + flow.y + motion;
    float envelope = 0.72 + 0.28 * cos(centered * 3.1415927);
    float broadBend = sin(centered * 3.1415927 + flow.y * 0.7);
    vec3 localPath = vec3(
      centered * shape.x + broadBend * shape.x * 0.08,
      (sin(arc) * 0.72 + sin(arc * 0.5 + 1.2) * 0.28) * shape.y * envelope,
      (cos(arc) * 0.7 + sin(arc * 0.45 - 0.8) * 0.3) * shape.z * envelope
    );
    float cosine = cos(flow.x);
    float sine = sin(flow.x);
    return vec3(
      localPath.x * cosine - localPath.y * sine,
      localPath.x * sine + localPath.y * cosine,
      localPath.z
    );
  }
`

const trailVertexShader = /* glsl */ `
  ${shaderPrelude}
  uniform vec2 uResolution;
  uniform float uLineOffset;
  attribute float aWidth;

  void main() {
    float progress = aProgress;
    float motion = uTime * aFlow.z;
    vec3 path = fluidPath(progress, aShape, aFlow, motion);
    vec3 tangent = normalize(
      fluidPath(progress + 0.002, aShape, aFlow, motion)
      - fluidPath(progress - 0.002, aShape, aFlow, motion)
    );
    vec3 movingCenter = aCenter + clusterDrift(aDrift, uTime);

    vec4 viewPosition = modelViewMatrix * vec4(movingCenter + path, 1.0);
    vec4 clipPosition = projectionMatrix * viewPosition;
    vec3 viewTangent = normalize(mat3(modelViewMatrix) * tangent);
    vec4 tangentPosition = projectionMatrix * vec4(viewPosition.xyz + viewTangent * 0.1, 1.0);
    vec2 screenDirection = normalize(
      tangentPosition.xy / tangentPosition.w - clipPosition.xy / clipPosition.w
    );
    vec2 screenNormal = vec2(-screenDirection.y, screenDirection.x);
    clipPosition.xy += screenNormal * uLineOffset * 2.0 / uResolution * clipPosition.w;
    gl_Position = clipPosition;

    float edgeFade = smoothstep(0.0, 0.08, progress)
      * (1.0 - smoothstep(0.92, 1.0, progress));
    float pulsePosition = abs(fract(progress - uTime * 0.09 - aFlow.x) - 0.5);
    float pulse = 0.24 + 1.3 * exp(-pulsePosition * pulsePosition * 95.0);
    float viewerDistance = distance(movingCenter.xz, uViewerPosition.xz);
    float chunkFade = 1.0 - smoothstep(64.0, 82.0, viewerDistance);
    float widthMask = 1.0 - step(aWidth + 0.1, abs(uLineOffset));
    vAlpha = edgeFade * pulse * chunkFade * widthMask;
    vTone = aTone;
  }
`

const trailFragmentShader = /* glsl */ `
  uniform vec3 uWorldColor;

  varying float vAlpha;
  varying float vTone;

  vec3 tintWorldColor(vec3 color) {
    float brightness = max(max(color.r, color.g), color.b);
    return mix(uWorldColor * (0.28 + brightness * 1.15), vec3(brightness), brightness * 0.38);
  }

  vec3 worldPalette(float tone) {
    vec3 midnight = vec3(0.015, 0.08, 0.32);
    vec3 cobalt = vec3(0.02, 0.24, 0.88);
    vec3 electricBlue = vec3(0.0, 0.62, 1.0);
    vec3 ice = vec3(0.62, 0.9, 1.0);
    if (tone < 0.38) return mix(midnight, cobalt, tone / 0.38);
    if (tone < 0.78) return mix(cobalt, electricBlue, (tone - 0.38) / 0.4);
    return mix(electricBlue, ice, (tone - 0.78) / 0.22);
  }

  void main() {
    vec3 color = tintWorldColor(worldPalette(vTone));
    gl_FragColor = vec4(color, vAlpha * 0.72);
  }
`

const particleVertexShader = /* glsl */ `
  ${shaderPrelude}
  uniform float uPixelRatio;
  attribute float aSize;

  void main() {
    float progress = fract(aProgress + uTime * aFlow.z);
    float phase = progress * 6.2831853 + aFlow.y;
    vec3 path = fluidPath(progress, aShape, aFlow, 0.0);
    vec3 movingCenter = aCenter + clusterDrift(aDrift, uTime);

    vec4 viewPosition = modelViewMatrix * vec4(movingCenter + path, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = aSize * uPixelRatio * (88.0 / max(1.0, -viewPosition.z));

    float edgeFade = smoothstep(0.0, 0.1, progress)
      * (1.0 - smoothstep(0.9, 1.0, progress));
    float shimmer = 0.55 + 0.45 * sin(phase * 5.0 - uTime * 2.4 + aFlow.x * 6.2831853);
    float viewerDistance = distance(movingCenter.xz, uViewerPosition.xz);
    float chunkFade = 1.0 - smoothstep(64.0, 82.0, viewerDistance);
    vAlpha = edgeFade * mix(0.4, 1.0, shimmer) * chunkFade;
    vTone = aTone;
  }
`

const particleFragmentShader = /* glsl */ `
  uniform vec3 uWorldColor;

  varying float vAlpha;
  varying float vTone;

  vec3 tintWorldColor(vec3 color) {
    float brightness = max(max(color.r, color.g), color.b);
    return mix(uWorldColor * (0.28 + brightness * 1.15), vec3(brightness), brightness * 0.38);
  }

  vec3 worldPalette(float tone) {
    vec3 midnight = vec3(0.015, 0.08, 0.32);
    vec3 cobalt = vec3(0.02, 0.24, 0.88);
    vec3 electricBlue = vec3(0.0, 0.62, 1.0);
    vec3 ice = vec3(0.62, 0.9, 1.0);
    if (tone < 0.38) return mix(midnight, cobalt, tone / 0.38);
    if (tone < 0.78) return mix(cobalt, electricBlue, (tone - 0.38) / 0.4);
    return mix(electricBlue, ice, (tone - 0.78) / 0.22);
  }

  void main() {
    float radius = length(gl_PointCoord - 0.5);
    if (radius > 0.5) discard;
    float core = 1.0 - smoothstep(0.06, 0.5, radius);
    vec3 color = tintWorldColor(worldPalette(vTone));
    gl_FragColor = vec4(color, core * vAlpha * 0.9);
  }
`

const frozenVertexShader = /* glsl */ `
  uniform vec3 uViewerPosition;
  uniform float uPixelRatio;

  attribute float aSize;
  attribute float aTone;

  varying float vAlpha;
  varying float vTone;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = aSize * uPixelRatio * (58.0 / max(1.0, -viewPosition.z));

    float viewerDistance = distance(position.xz, uViewerPosition.xz);
    vAlpha = 1.0 - smoothstep(105.0, 135.0, viewerDistance);
    vTone = aTone;
  }
`

const frozenFragmentShader = /* glsl */ `
  uniform vec3 uWorldColor;

  varying float vAlpha;
  varying float vTone;

  vec3 tintWorldColor(vec3 color) {
    float brightness = max(max(color.r, color.g), color.b);
    return mix(uWorldColor * (0.28 + brightness * 1.15), vec3(brightness), brightness * 0.38);
  }

  void main() {
    vec2 point = abs(gl_PointCoord - 0.5);
    float diamond = point.x + point.y;
    if (diamond > 0.5) discard;
    float core = 1.0 - smoothstep(0.04, 0.5, diamond);
    vec3 frost = mix(vec3(0.12, 0.42, 1.0), vec3(0.78, 0.94, 1.0), vTone);
    gl_FragColor = vec4(tintWorldColor(frost), core * vAlpha * 0.78);
  }
`

const CHUNK_SIZE = 80
const CHUNK_RADIUS = 1
const TRAILS_PER_CHUNK = 96
const SEGMENTS_PER_TRAIL = 26
const TRAIL_VERTICES_PER_CHUNK = TRAILS_PER_CHUNK * SEGMENTS_PER_TRAIL * 2
const PARTICLES_PER_CHUNK = 3600
const FROZEN_PARTICLES_PER_CHUNK = 1200
const ALTITUDE_BANDS = [-34, 0, 34]

function coordinateSeed(x, z) {
  let seed = Math.imul(x, 374761393) ^ Math.imul(z, 668265263)
  seed = Math.imul(seed ^ (seed >>> 13), 1274126177)
  return (seed ^ (seed >>> 16)) >>> 0
}

function createRandom(seed) {
  return () => {
    seed += 0x6d2b79f5
    let value = seed
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createGeometry(count, includeSize = false, includeWidth = false) {
  const data = {
    centers: new Float32Array(count * 3),
    shapes: new Float32Array(count * 3),
    flows: new Float32Array(count * 3),
    drifts: new Float32Array(count * 3),
    progresses: new Float32Array(count),
    tones: new Float32Array(count),
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('aCenter', new THREE.BufferAttribute(data.centers, 3))
  geometry.setAttribute('aShape', new THREE.BufferAttribute(data.shapes, 3))
  geometry.setAttribute('aFlow', new THREE.BufferAttribute(data.flows, 3))
  geometry.setAttribute('aDrift', new THREE.BufferAttribute(data.drifts, 3))
  geometry.setAttribute('aProgress', new THREE.BufferAttribute(data.progresses, 1))
  geometry.setAttribute('aTone', new THREE.BufferAttribute(data.tones, 1))
  if (includeSize) {
    data.sizes = new Float32Array(count)
    geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1))
  }
  if (includeWidth) {
    data.widths = new Float32Array(count)
    geometry.setAttribute('aWidth', new THREE.BufferAttribute(data.widths, 1))
  }
  return { geometry, ...data }
}

function createFrozenGeometry(count) {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const tones = new Float32Array(count)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aTone', new THREE.BufferAttribute(tones, 1))
  return { geometry, positions, sizes, tones }
}

export class FluidRibbonField {
  constructor() {
    const chunkWidth = CHUNK_RADIUS * 2 + 1
    this.trails = createGeometry(chunkWidth * chunkWidth * TRAIL_VERTICES_PER_CHUNK, false, true)
    this.particles = createGeometry(chunkWidth * chunkWidth * PARTICLES_PER_CHUNK, true)
    this.frozenParticles = createFrozenGeometry(
      chunkWidth * chunkWidth * FROZEN_PARTICLES_PER_CHUNK,
    )
    this.centerChunkX = Number.NaN
    this.centerChunkZ = Number.NaN

    this.uniforms = {
      uTime: { value: 0 },
      uViewerPosition: { value: new THREE.Vector3() },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uWorldColor: { value: new THREE.Color('#1557ff') },
    }
    const materialOptions = {
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }
    this.particleMaterial = new THREE.ShaderMaterial({
      ...materialOptions,
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: this.uniforms,
    })
    this.frozenMaterial = new THREE.ShaderMaterial({
      ...materialOptions,
      vertexShader: frozenVertexShader,
      fragmentShader: frozenFragmentShader,
      uniforms: this.uniforms,
    })

    const particleObject = new THREE.Points(this.particles.geometry, this.particleMaterial)
    const frozenObject = new THREE.Points(this.frozenParticles.geometry, this.frozenMaterial)
    particleObject.frustumCulled = false
    frozenObject.frustumCulled = false
    this.object3D = new THREE.Group()
    for (const lineOffset of [-2, -1, 0, 1, 2]) {
      const trailMaterial = new THREE.ShaderMaterial({
        ...materialOptions,
        vertexShader: trailVertexShader,
        fragmentShader: trailFragmentShader,
        uniforms: {
          ...this.uniforms,
          uLineOffset: { value: lineOffset },
        },
      })
      const trailObject = new THREE.LineSegments(this.trails.geometry, trailMaterial)
      trailObject.frustumCulled = false
      this.object3D.add(trailObject)
    }
    this.object3D.add(particleObject, frozenObject)
    this.updateChunks(new THREE.Vector3())
  }

  populateChunk(chunkX, chunkZ, trailStartIndex, particleStartIndex, frozenStartIndex) {
    const random = createRandom(coordinateSeed(chunkX, chunkZ))
    const clusterCount = 3 + Math.floor(random() * 2)
    const clusters = Array.from({ length: clusterCount }, (_, clusterIndex) => ({
      x: (chunkX + 0.5) * CHUNK_SIZE + (random() - 0.5) * CHUNK_SIZE * 0.55,
      y: ALTITUDE_BANDS[clusterIndex % ALTITUDE_BANDS.length] + (random() - 0.5) * 16,
      z: (chunkZ + 0.5) * CHUNK_SIZE + (random() - 0.5) * CHUNK_SIZE * 0.55,
      length: 28 + random() * 34,
      height: 5 + random() * 9,
      depth: 4 + random() * 9,
      phase: random() * 1.2 - 0.6,
      orientation: (random() < 0.5 ? -1 : 1) * (0.95 + random() * 0.7),
      drift: [random() * Math.PI * 2, random() * Math.PI * 2, 0.045 + random() * 0.035],
    }))

    const fibersPerCluster = Math.max(12, Math.floor(TRAILS_PER_CHUNK / clusterCount))
    for (let trailIndex = 0; trailIndex < TRAILS_PER_CHUNK; trailIndex += 1) {
      const cluster = clusters[trailIndex % clusterCount]
      const fiber = Math.floor(trailIndex / clusterCount) % fibersPerCluster
      const fiberRatio = fiber / Math.max(1, fibersPerCluster - 1) - 0.5
      const sparseScatter = Math.pow(random(), 3)
      const center = [
        cluster.x,
        cluster.y + fiberRatio * cluster.height * 1.15,
        cluster.z + (random() - 0.5) * cluster.depth * sparseScatter * 0.55,
      ]
      const shape = [
        cluster.length * (1.25 + random() * 0.25),
        cluster.height * (1.38 + random() * 0.32),
        cluster.depth * (0.8 + random() * 0.25),
      ]
      const flow = [
        cluster.orientation + (random() - 0.5) * 0.12,
        cluster.phase + fiberRatio * 0.82 + (random() - 0.5) * 0.04,
        0.08 + random() * 0.12,
      ]
      const tone = random() < 0.2 ? 0.95 : 0.2 + random() * 0.55
      const widthRoll = random()
      const width = widthRoll < 0.2 ? 0 : widthRoll < 0.75 ? 1 : 2

      for (let segment = 0; segment < SEGMENTS_PER_TRAIL; segment += 1) {
        for (let endpoint = 0; endpoint < 2; endpoint += 1) {
          const localIndex = (trailIndex * SEGMENTS_PER_TRAIL + segment) * 2 + endpoint
          const index = trailStartIndex + localIndex
          const offset = index * 3
          this.trails.centers.set(center, offset)
          this.trails.shapes.set(shape, offset)
          this.trails.flows.set(flow, offset)
          this.trails.drifts.set(cluster.drift, offset)
          this.trails.progresses[index] = (segment + endpoint) / SEGMENTS_PER_TRAIL
          this.trails.tones[index] = tone
          this.trails.widths[index] = width
        }
      }
    }

    for (let localIndex = 0; localIndex < PARTICLES_PER_CHUNK; localIndex += 1) {
      const index = particleStartIndex + localIndex
      const offset = index * 3
      const cluster = clusters[localIndex % clusterCount]
      const fiberRatio = random() - 0.5
      this.particles.centers[offset] = cluster.x
      this.particles.centers[offset + 1] = cluster.y + fiberRatio * cluster.height * 1.8
      this.particles.centers[offset + 2] = cluster.z + (random() - 0.5) * cluster.depth
      this.particles.shapes[offset] = cluster.length * (0.8 + random() * 0.35)
      this.particles.shapes[offset + 1] = cluster.height * (0.7 + random() * 0.4)
      this.particles.shapes[offset + 2] = cluster.depth * (0.65 + random() * 0.45)
      this.particles.flows[offset] = cluster.orientation + (random() - 0.5) * 0.18
      this.particles.flows[offset + 1] = cluster.phase + fiberRatio * 1.15
      this.particles.flows[offset + 2] = 0.018 + random() * 0.025
      this.particles.drifts.set(cluster.drift, offset)
      this.particles.progresses[index] = random()
      this.particles.tones[index] = random() < 0.22 ? 0.95 : 0.2 + random() * 0.55
      this.particles.sizes[index] = 1.6 + Math.pow(random(), 3) * 4
    }

    const frozenRandom = createRandom(coordinateSeed(chunkX, chunkZ) ^ 0xa53c9e17)
    for (let localIndex = 0; localIndex < FROZEN_PARTICLES_PER_CHUNK; localIndex += 1) {
      const index = frozenStartIndex + localIndex
      const offset = index * 3
      this.frozenParticles.positions[offset] = chunkX * CHUNK_SIZE + frozenRandom() * CHUNK_SIZE
      this.frozenParticles.positions[offset + 1] = (frozenRandom() - 0.5) * 104
      this.frozenParticles.positions[offset + 2] = chunkZ * CHUNK_SIZE + frozenRandom() * CHUNK_SIZE
      this.frozenParticles.sizes[index] = 1.8 + Math.pow(frozenRandom(), 2.5) * 4.8
      this.frozenParticles.tones[index] = 0.45 + frozenRandom() * 0.55
    }
  }

  updateChunks(viewerPosition) {
    const chunkX = Math.floor(viewerPosition.x / CHUNK_SIZE)
    const chunkZ = Math.floor(viewerPosition.z / CHUNK_SIZE)
    if (chunkX === this.centerChunkX && chunkZ === this.centerChunkZ) return

    this.centerChunkX = chunkX
    this.centerChunkZ = chunkZ
    let chunkIndex = 0
    for (let z = -CHUNK_RADIUS; z <= CHUNK_RADIUS; z += 1) {
      for (let x = -CHUNK_RADIUS; x <= CHUNK_RADIUS; x += 1) {
        this.populateChunk(
          chunkX + x,
          chunkZ + z,
          chunkIndex * TRAIL_VERTICES_PER_CHUNK,
          chunkIndex * PARTICLES_PER_CHUNK,
          chunkIndex * FROZEN_PARTICLES_PER_CHUNK,
        )
        chunkIndex += 1
      }
    }

    for (const field of [this.trails, this.particles]) {
      for (const name of ['aCenter', 'aShape', 'aFlow', 'aDrift', 'aProgress', 'aTone']) {
        field.geometry.getAttribute(name).needsUpdate = true
      }
    }
    this.particles.geometry.getAttribute('aSize').needsUpdate = true
    this.trails.geometry.getAttribute('aWidth').needsUpdate = true
    for (const name of ['position', 'aSize', 'aTone']) {
      this.frozenParticles.geometry.getAttribute(name).needsUpdate = true
    }
  }

  update(elapsed, viewerPosition, worldColor) {
    this.updateChunks(viewerPosition)
    this.uniforms.uTime.value = elapsed
    this.uniforms.uWorldColor.value.copy(worldColor)
    this.uniforms.uViewerPosition.value.copy(viewerPosition)
  }

  resize() {
    this.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
    this.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
  }
}