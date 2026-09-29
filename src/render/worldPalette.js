import * as THREE from 'three'

const CYCLE_SECONDS = 180
const PALETTE = [
  '#203b68',
  '#334b8f',
  '#6757a8',
  '#88578f',
  '#c47745',
  '#d6a62f',
  '#b79336',
  '#56bca9',
  '#279f9a',
  '#299db2',
  '#2d668e',
].map((color) => new THREE.Color(color))

export function sampleWorldColor(elapsed, target) {
  const palettePosition = (elapsed / CYCLE_SECONDS) * PALETTE.length
  const index = Math.floor(palettePosition) % PALETTE.length
  const blend = THREE.MathUtils.smoothstep(palettePosition % 1, 0, 1)
  return target.lerpColors(PALETTE[index], PALETTE[(index + 1) % PALETTE.length], blend)
}