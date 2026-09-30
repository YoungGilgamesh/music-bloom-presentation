import * as THREE from 'three'
import { SoulAvatar } from '../render/SoulAvatar.js'

const NPC_COUNT = 12
const RECYCLE_DISTANCE = 72

function createRandom(seed) {
  return () => {
    seed += 0x6d2b79f5
    let value = seed
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export class WanderingSouls {
  constructor() {
    this.object3D = new THREE.Group()
    this.random = createRandom(0x51a7c0de)
    this.npcs = Array.from({ length: NPC_COUNT }, (_, index) => {
      const soul = new SoulAvatar()
      const scale = index === 0 ? 1 : 0.45 + this.random() * 0.47
      const shape = index % 3
      const widthRatio = index === 0
        ? 1
        : shape === 0
          ? 0.62 + this.random() * 0.12
          : shape === 1
            ? 0.84 + this.random() * 0.16
            : Math.min(1.42, 0.98 / scale)
      const heading = this.random() * Math.PI * 2
      soul.object3D.scale.set(scale * widthRatio, scale, scale * widthRatio)
      this.object3D.add(soul.object3D)
      return {
        soul,
        direction: new THREE.Vector2(Math.sin(heading), Math.cos(heading)),
        targetDirection: new THREE.Vector2(Math.sin(heading), Math.cos(heading)),
        speed: 0.28 + this.random() * 0.52,
        phase: this.random() * Math.PI * 2,
        nextTurn: this.random() * 5,
      }
    })
    this.npcs.forEach((npc, index) => this.placeNpc(npc, new THREE.Vector3(), index < 4))
  }

  placeNpc(npc, viewerPosition, placeNearby = false) {
    const angle = this.random() * Math.PI * 2
    const distance = placeNearby
      ? 8 + this.random() * 15
      : 22 + this.random() * 38
    npc.soul.object3D.position.set(
      viewerPosition.x + Math.sin(angle) * distance,
      0,
      viewerPosition.z + Math.cos(angle) * distance,
    )
  }

  update(elapsed, delta, viewerPosition, worldColor) {
    for (const npc of this.npcs) {
      if (elapsed >= npc.nextTurn) {
        const heading = this.random() * Math.PI * 2
        npc.targetDirection.set(Math.sin(heading), Math.cos(heading))
        npc.nextTurn = elapsed + 4 + this.random() * 8
      }

      npc.direction.lerp(npc.targetDirection, 1 - Math.exp(-delta * 0.7)).normalize()
      npc.soul.object3D.position.x += npc.direction.x * npc.speed * delta
      npc.soul.object3D.position.z += npc.direction.y * npc.speed * delta
      npc.soul.object3D.rotation.y = Math.atan2(npc.direction.x, npc.direction.y)

      const distance = Math.hypot(
        npc.soul.object3D.position.x - viewerPosition.x,
        npc.soul.object3D.position.z - viewerPosition.z,
      )
      if (distance > RECYCLE_DISTANCE) this.placeNpc(npc, viewerPosition)

      npc.soul.update(elapsed + npc.phase, true, worldColor)
    }
  }
}