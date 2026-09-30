import * as THREE from 'three'

const MAX_PARTICLES = 256
const EMISSION_INTERVAL = 0.035

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;

  attribute float aBirth;
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aVelocity;

  varying float vAlpha;

  void main() {
    float age = uTime - aBirth;
    float life = 1.0 - clamp(age / 2.4, 0.0, 1.0);
    vec3 animatedPosition = position + aVelocity * age;
    animatedPosition.x += sin(age * 4.0 + aSeed * 6.2831853) * age * 0.12;
    animatedPosition.z += cos(age * 3.2 + aSeed * 6.2831853) * age * 0.12;

    vec4 viewPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = aSize * uPixelRatio * life * (72.0 / max(1.0, -viewPosition.z));
    vAlpha = smoothstep(0.0, 0.12, age) * life * life * step(0.0, age);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uWorldColor;

  varying float vAlpha;

  void main() {
    float radius = length(gl_PointCoord - 0.5);
    if (radius > 0.5) discard;
    float glow = 1.0 - smoothstep(0.05, 0.5, radius);
    vec3 color = mix(uWorldColor * 1.25, vec3(1.0), glow * 0.55);
    gl_FragColor = vec4(color, glow * vAlpha * 0.72);
  }
`

export class SoulTrail {
  constructor() {
    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.velocities = new Float32Array(MAX_PARTICLES * 3)
    this.births = new Float32Array(MAX_PARTICLES).fill(-100)
    this.sizes = new Float32Array(MAX_PARTICLES)
    this.seeds = new Float32Array(MAX_PARTICLES)
    this.nextParticle = 0
    this.lastEmission = 0
    this.emissionDirection = new THREE.Vector3()

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(this.velocities, 3))
    geometry.setAttribute('aBirth', new THREE.BufferAttribute(this.births, 1))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1))

    this.uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uWorldColor: { value: new THREE.Color('#203b68') },
    }
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.object3D = new THREE.Points(geometry, material)
    this.object3D.frustumCulled = false
  }

  emit(position, direction, elapsed) {
    for (let count = 0; count < 3; count += 1) {
      const index = this.nextParticle
      const offset = index * 3
      const jitterX = (Math.random() - 0.5) * 0.1
      const jitterZ = (Math.random() - 0.5) * 0.1

      this.positions[offset] = position.x + jitterX
      this.positions[offset + 1] = position.y + 0.2 + Math.random() * 0.06
      this.positions[offset + 2] = position.z + jitterZ
      this.velocities[offset] = -direction.x * (0.08 + Math.random() * 0.16)
      this.velocities[offset + 1] = 0.18 + Math.random() * 0.38
      this.velocities[offset + 2] = -direction.z * (0.08 + Math.random() * 0.16)
      this.births[index] = elapsed
      this.sizes[index] = 1 + Math.random() * 1.6
      this.seeds[index] = Math.random()
      this.nextParticle = (index + 1) % MAX_PARTICLES
    }

    for (const name of ['position', 'aVelocity', 'aBirth', 'aSize', 'aSeed']) {
      this.object3D.geometry.getAttribute(name).needsUpdate = true
    }
  }

  update(elapsed, isMoving, position, direction, worldColor) {
    this.uniforms.uTime.value = elapsed
    this.uniforms.uWorldColor.value.copy(worldColor)
    if (isMoving && elapsed - this.lastEmission >= EMISSION_INTERVAL) {
      this.emissionDirection.copy(direction).normalize()
      this.emit(position, this.emissionDirection, elapsed)
      this.lastEmission = elapsed
    }
  }

  resize() {
    this.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
  }
}