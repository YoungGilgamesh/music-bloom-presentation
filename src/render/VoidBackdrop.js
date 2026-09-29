import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uWorldColor;

  varying vec3 vDirection;

  vec3 tintWorldColor(vec3 color) {
    float brightness = max(max(color.r, color.g), color.b);
    vec3 tinted = uWorldColor * (0.42 + brightness * 1.05);
    float highlight = smoothstep(0.72, 1.0, brightness) * 0.5;
    return mix(tinted, vec3(brightness), highlight);
  }

  float random(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(random(cell), random(cell + vec2(1.0, 0.0)), local.x),
      mix(random(cell + vec2(0.0, 1.0)), random(cell + vec2(1.0)), local.x),
      local.y
    );
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.55;
    for (int octave = 0; octave < 5; octave += 1) {
      value += noise(point) * amplitude;
      point = point * 2.03 + vec2(13.7, 9.2);
      amplitude *= 0.48;
    }
    return value;
  }

  float directionalFbm(vec3 direction, float scale, vec2 drift) {
    vec3 weights = pow(abs(direction), vec3(4.0));
    weights /= max(weights.x + weights.y + weights.z, 0.0001);
    return fbm(direction.yz * scale + drift) * weights.x
      + fbm(direction.zx * scale + drift.yx) * weights.y
      + fbm(direction.xy * scale - drift) * weights.z;
  }

  float hash(float value) {
    return fract(sin(value * 127.1) * 43758.5453);
  }

  vec3 bokehDisc(
    vec3 direction,
    vec3 center,
    float radius,
    vec3 color,
    float intensity
  ) {
    float distanceToLight = length(direction - normalize(center));
    float disc = 1.0 - smoothstep(radius * 0.32, radius, distanceToLight);
    float halo = exp(-distanceToLight * distanceToLight / (radius * radius * 3.5));
    return color * (disc * 0.56 + halo * 0.34) * intensity;
  }

  vec3 bokehField(vec3 direction, float time) {
    vec3 light = vec3(0.0);
    for (int index = 0; index < 12; index += 1) {
      float seed = float(index) + 1.0;
      float longitude = hash(seed * 1.37) * 6.2831853 + time * mix(-0.012, 0.012, hash(seed * 4.17));
      float latitude = mix(-0.88, 0.88, hash(seed * 2.71));
      float latitudeRadius = sqrt(max(0.0, 1.0 - latitude * latitude));
      vec3 center = vec3(
        cos(longitude) * latitudeRadius,
        latitude,
        sin(longitude) * latitudeRadius
      );

      float radius = mix(0.12, 0.32, pow(hash(seed * 5.93), 1.4));
      float distanceToLight = length(direction - center);
      float disc = 1.0 - smoothstep(radius * 0.18, radius, distanceToLight);
      float halo = exp(-distanceToLight * distanceToLight / (radius * radius * 4.2));
      float intensity = mix(0.24, 0.68, hash(seed * 8.41));
      vec3 deepBlue = vec3(0.015, 0.12, 0.52);
      vec3 brightBlue = vec3(0.04, 0.58, 1.0);
      vec3 bokehColor = mix(deepBlue, brightBlue, hash(seed * 3.23));
      light += bokehColor * (disc * 0.56 + halo * 0.34) * intensity;
    }
    light += bokehDisc(direction, vec3(-0.52, 0.18, -1.0), 0.22, vec3(0.02, 0.44, 1.0), 0.46);
    light += bokehDisc(direction, vec3(0.42, 0.28, -1.0), 0.3, vec3(0.04, 0.22, 0.72), 0.36);
    light += bokehDisc(direction, vec3(-0.28, -0.36, -1.0), 0.18, vec3(0.35, 0.78, 1.0), 0.5);
    light += bokehDisc(direction, vec3(0.55, -0.3, -1.0), 0.25, vec3(0.01, 0.14, 0.55), 0.34);
    return light;
  }

  void main() {
    vec3 direction = normalize(vDirection);
    vec2 uv = vec2(
      atan(direction.z, direction.x) / 6.2831853 + 0.5,
      asin(clamp(direction.y, -1.0, 1.0)) / 3.1415927 + 0.5
    );

    vec3 lower = vec3(0.001, 0.006, 0.035);
    vec3 middle = vec3(0.002, 0.025, 0.12);
    vec3 upper = vec3(0.004, 0.07, 0.22);
    vec3 color = mix(lower, middle, smoothstep(0.05, 0.52, uv.y));
    color = mix(color, upper, smoothstep(0.5, 0.96, uv.y));

    float drift = uTime * 0.003;
    float broadField = directionalFbm(direction, 2.4, vec2(drift, -drift * 0.6));
    float detailField = directionalFbm(direction, 5.2, vec2(-drift * 0.7, drift));
    float haze = smoothstep(0.44, 0.88, broadField) * 0.2;
    float softHighlight = smoothstep(0.58, 0.94, detailField) * 0.16;
    vec3 hazeColor = mix(
      vec3(0.0, 0.16, 0.58),
      vec3(0.0, 0.38, 0.86),
      smoothstep(0.2, 0.8, broadField)
    );
    color += hazeColor * haze + vec3(0.08, 0.42, 0.9) * softHighlight;
    color += bokehField(direction, uTime);

    float vignette = 1.0 - smoothstep(0.42, 0.92, abs(uv.y - 0.52));
    color *= mix(0.72, 1.0, vignette);
    gl_FragColor = vec4(tintWorldColor(color), 1.0);
  }
`

export class VoidBackdrop {
  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWorldColor: { value: new THREE.Color('#1557ff') },
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    })
    this.object3D = new THREE.Mesh(
      new THREE.SphereGeometry(240, 48, 32),
      this.material,
    )
    this.object3D.renderOrder = -100
    this.object3D.frustumCulled = false
  }

  update(cameraPosition, elapsed, worldColor) {
    this.object3D.position.copy(cameraPosition)
    this.material.uniforms.uTime.value = elapsed
    this.material.uniforms.uWorldColor.value.copy(worldColor)
  }
}