import * as THREE from 'three'

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uDistortion;

  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying float vNoise;

  void main() {
    vec3 transformed = position;
    float ripple = sin(position.y * 8.0 + uTime * 1.6)
      * sin(position.x * 11.0 - uTime * 1.1)
      * sin(position.z * 9.0 + uTime * 0.8);
    float slowWarp = sin(position.y * 2.7 - uTime * 0.65 + position.x * 3.0);
    transformed += normal * (ripple * 0.035 + slowWarp * 0.025) * uDistortion;

    vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(-viewPosition.xyz);
    vNoise = ripple * 0.5 + 0.5;
    gl_Position = projectionMatrix * viewPosition;
  }
`

const coreFragmentShader = /* glsl */ `
  uniform vec3 uWorldColor;

  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying float vNoise;

  vec3 tintWorldColor(vec3 color) {
    float brightness = max(max(color.r, color.g), color.b);
    return mix(uWorldColor * (0.16 + brightness), vec3(brightness), brightness * 0.4);
  }

  void main() {
    float rim = pow(1.0 - abs(dot(vNormal, vViewDirection)), 2.4);
    vec3 interior = vec3(0.001, 0.004, 0.012);
    vec3 edge = vec3(0.015, 0.08, 0.22);
    vec3 color = mix(interior, edge, rim * (0.55 + vNoise * 0.25));
    gl_FragColor = vec4(tintWorldColor(color), 0.5);
  }
`

const auraFragmentShader = /* glsl */ `
  uniform vec3 uWorldColor;

  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying float vNoise;

  vec3 tintWorldColor(vec3 color) {
    float brightness = max(max(color.r, color.g), color.b);
    return mix(uWorldColor * (0.4 + brightness), vec3(brightness), brightness * 0.48);
  }

  void main() {
    float rim = pow(1.0 - abs(dot(vNormal, vViewDirection)), 2.0);
    float alpha = rim * (0.16 + vNoise * 0.14);
    vec3 color = mix(vec3(0.08, 0.36, 1.0), vec3(0.72, 0.92, 1.0), rim);
    gl_FragColor = vec4(tintWorldColor(color), alpha);
  }
`

function createSoulGeometry() {
  const profile = [
    new THREE.Vector2(0.025, 0.05),
    new THREE.Vector2(0.075, 0.28),
    new THREE.Vector2(0.19, 0.62),
    new THREE.Vector2(0.37, 1.05),
    new THREE.Vector2(0.45, 1.46),
    new THREE.Vector2(0.4, 1.76),
    new THREE.Vector2(0.28, 1.98),
    new THREE.Vector2(0.14, 2.05),
  ]
  return new THREE.LatheGeometry(profile, 48, 0, Math.PI * 2)
}

function createMaterial(
  fragmentShader,
  uniforms,
  side = THREE.FrontSide,
  blending = THREE.AdditiveBlending,
) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    side,
    blending,
  })
}

export class SoulAvatar {
  constructor() {
    this.object3D = new THREE.Group()
    this.visual = new THREE.Group()
    this.object3D.add(this.visual)
    this.lean = 0
    this.lastElapsed = 0

    this.uniforms = {
      uTime: { value: 0 },
      uDistortion: { value: 1 },
      uWorldColor: { value: new THREE.Color('#1557ff') },
    }

    const bodyGeometry = createSoulGeometry()
    const headGeometry = new THREE.SphereGeometry(0.31, 36, 24)
    const coreMaterial = createMaterial(
      coreFragmentShader,
      this.uniforms,
      THREE.FrontSide,
      THREE.NormalBlending,
    )
    const auraMaterial = createMaterial(auraFragmentShader, this.uniforms, THREE.BackSide)

    const bodyCore = new THREE.Mesh(bodyGeometry, coreMaterial)
    const bodyAura = new THREE.Mesh(bodyGeometry, auraMaterial)
    bodyAura.scale.set(1.16, 1.05, 1.16)

    const headCore = new THREE.Mesh(headGeometry, coreMaterial)
    headCore.position.y = 2.32
    const headAura = new THREE.Mesh(headGeometry, auraMaterial)
    headAura.position.copy(headCore.position)
    headAura.scale.setScalar(1.2)

    this.visual.add(bodyAura, bodyCore, headAura, headCore)
    this.visual.position.y = 0.18
  }

  update(elapsed, isMoving, worldColor) {
    const delta = Math.min(elapsed - this.lastElapsed, 0.1)
    this.lastElapsed = elapsed
    const targetLean = isMoving ? 0.16 : 0
    this.lean = THREE.MathUtils.damp(this.lean, targetLean, 6, delta)

    this.uniforms.uTime.value = elapsed
    this.uniforms.uWorldColor.value.copy(worldColor)
    this.visual.position.y = 0.18 + Math.sin(elapsed * 1.35) * 0.09
    this.visual.rotation.x = this.lean
    this.visual.rotation.z = Math.sin(elapsed * 0.72) * 0.035
    this.uniforms.uDistortion.value = isMoving ? 1.35 : 1
  }
}