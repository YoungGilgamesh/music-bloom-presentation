import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { FluidRibbonField } from './particles/FluidRibbonField.js'
import { SoulAvatar } from './render/SoulAvatar.js'
import { VoidBackdrop } from './render/VoidBackdrop.js'
import { sampleWorldColor } from './render/worldPalette.js'
import titleImageUrl from './assets/musicBloom_title.png'
import nameImageUrl from './assets/name.png'
import conceptImageUrl from './assets/concept.png'
import descriptionImageUrl from './assets/description.png'
import inspirationImageUrl from './assets/inspiration.png'
import toolImageUrl from './assets/tool.png'
import demoImageUrl from './assets/demo.png'
import './style.css'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  300,
)
camera.position.set(0, 8.5, 7)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.querySelector('#app').appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.enablePan = false
controls.minDistance = 3
controls.maxDistance = 12
controls.maxPolarAngle = Math.PI
controls.target.set(0, 4, 0)
controls.update()

const soul = new SoulAvatar()
const avatar = soul.object3D
scene.add(avatar)

const titleTexture = new THREE.TextureLoader().load(titleImageUrl)
titleTexture.colorSpace = THREE.SRGBColorSpace
const titleMaterial = new THREE.MeshBasicMaterial({
  map: titleTexture,
  transparent: true,
  alphaTest: 0.02,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
})
const title = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 3.9),
  titleMaterial,
)
title.position.set(0, 4.5, -11)
scene.add(title)

const nameTexture = new THREE.TextureLoader().load(nameImageUrl)
nameTexture.colorSpace = THREE.SRGBColorSpace
const nameMaterial = new THREE.MeshBasicMaterial({
  map: nameTexture,
  transparent: true,
  opacity: 0,
  alphaTest: 0.02,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
})
const namePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 3.77),
  nameMaterial,
)
namePlane.position.set(0, 4.5, -26)
scene.add(namePlane)

const conceptTexture = new THREE.TextureLoader().load(conceptImageUrl)
conceptTexture.colorSpace = THREE.SRGBColorSpace
const conceptMaterial = new THREE.MeshBasicMaterial({
  map: conceptTexture,
  transparent: true,
  opacity: 0,
  alphaTest: 0.02,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
})
const conceptPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 4.9),
  conceptMaterial,
)
conceptPlane.position.set(0, 4.5, -42)
scene.add(conceptPlane)

const descriptionTexture = new THREE.TextureLoader().load(descriptionImageUrl)
descriptionTexture.colorSpace = THREE.SRGBColorSpace
const descriptionMaterial = new THREE.MeshBasicMaterial({
  map: descriptionTexture,
  transparent: true,
  opacity: 0,
  alphaTest: 0.02,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
})
const descriptionPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 3.34),
  descriptionMaterial,
)
descriptionPlane.position.set(0, 4.5, -58)
scene.add(descriptionPlane)

const inspirationTexture = new THREE.TextureLoader().load(inspirationImageUrl)
inspirationTexture.colorSpace = THREE.SRGBColorSpace
const inspirationMaterial = new THREE.MeshBasicMaterial({
  map: inspirationTexture,
  transparent: true,
  opacity: 0,
  alphaTest: 0.02,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
})
const inspirationPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 6.64),
  inspirationMaterial,
)
inspirationPlane.position.set(0, 4.5, -74)
scene.add(inspirationPlane)

const toolTexture = new THREE.TextureLoader().load(toolImageUrl)
toolTexture.colorSpace = THREE.SRGBColorSpace
const toolMaterial = new THREE.MeshBasicMaterial({
  map: toolTexture,
  transparent: true,
  opacity: 0,
  alphaTest: 0.02,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
})
const toolPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 3.77),
  toolMaterial,
)
toolPlane.position.set(0, 4.5, -90)
scene.add(toolPlane)

const demoTexture = new THREE.TextureLoader().load(demoImageUrl)
demoTexture.colorSpace = THREE.SRGBColorSpace
const demoMaterial = new THREE.MeshBasicMaterial({
  map: demoTexture,
  transparent: true,
  opacity: 0,
  alphaTest: 0.02,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
})
const demoPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 1.53),
  demoMaterial,
)
demoPlane.position.set(0, 4.5, -106)
scene.add(demoPlane)

const ambientLight = new THREE.HemisphereLight('#237dff', '#01040c', 0.9)
scene.add(ambientLight)

const keyLight = new THREE.DirectionalLight('#7abaff', 1.35)
keyLight.position.set(12, 18, 8)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(2048, 2048)
keyLight.shadow.camera.left = -20
keyLight.shadow.camera.right = 20
keyLight.shadow.camera.top = 20
keyLight.shadow.camera.bottom = -20
scene.add(keyLight)

const rimLight = new THREE.DirectionalLight('#075dff', 1.2)
rimLight.position.set(-10, 7, -8)
scene.add(rimLight)

const fluidRibbons = new FluidRibbonField()
scene.add(fluidRibbons.object3D)

const backdrop = new VoidBackdrop()
scene.add(backdrop.object3D)

const keys = new Set()
const timer = new THREE.Timer()
const movement = new THREE.Vector3()
const cameraForward = new THREE.Vector3()
const cameraRight = new THREE.Vector3()
const worldColor = new THREE.Color()
const lightColor = new THREE.Color()
const moveSpeed = 5
let titleTransitionTriggered = false
let titleTransitionProgress = 0
let nameTransitionTriggered = false
let nameTransitionProgress = 0
let conceptTransitionTriggered = false
let conceptTransitionProgress = 0
let descriptionTransitionTriggered = false
let descriptionTransitionProgress = 0
let inspirationTransitionTriggered = false
let inspirationTransitionProgress = 0
let toolTransitionTriggered = false
let toolTransitionProgress = 0

window.addEventListener('keydown', (event) => {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
    keys.add(event.code)
    event.preventDefault()
  }
})

window.addEventListener('keyup', (event) => keys.delete(event.code))
window.addEventListener('blur', () => keys.clear())

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  fluidRibbons.resize()
})

function animate() {
  timer.update()
  const delta = Math.min(timer.getDelta(), 0.1)
  const forwardInput = Number(keys.has('KeyW')) - Number(keys.has('KeyS'))
  const rightInput = Number(keys.has('KeyD')) - Number(keys.has('KeyA'))

  camera.getWorldDirection(cameraForward)
  cameraForward.y = 0
  cameraForward.normalize()
  cameraRight.crossVectors(cameraForward, camera.up).normalize()
  movement
    .copy(cameraForward)
    .multiplyScalar(forwardInput)
    .addScaledVector(cameraRight, rightInput)

  const isWalking = movement.lengthSq() > 0
  if (isWalking) {
    movement.normalize().multiplyScalar(moveSpeed * delta)
    avatar.position.add(movement)
    avatar.rotation.y = Math.atan2(movement.x, movement.z)
    camera.position.add(movement)
    controls.target.add(movement)
  }

  const titleDistance = Math.hypot(
    avatar.position.x - title.position.x,
    avatar.position.z - title.position.z,
  )
  if (titleDistance < 3) titleTransitionTriggered = true
  if (titleTransitionTriggered) {
    titleTransitionProgress = THREE.MathUtils.damp(
      titleTransitionProgress,
      1,
      1.8,
      delta,
    )
  }
  const nameDistance = Math.hypot(
    avatar.position.x - namePlane.position.x,
    avatar.position.z - namePlane.position.z,
  )
  if (nameDistance < 3) nameTransitionTriggered = true
  if (nameTransitionTriggered) {
    nameTransitionProgress = THREE.MathUtils.damp(
      nameTransitionProgress,
      1,
      1.8,
      delta,
    )
  }
  const conceptDistance = Math.hypot(
    avatar.position.x - conceptPlane.position.x,
    avatar.position.z - conceptPlane.position.z,
  )
  if (conceptDistance < 3) conceptTransitionTriggered = true
  if (conceptTransitionTriggered) {
    conceptTransitionProgress = THREE.MathUtils.damp(
      conceptTransitionProgress,
      1,
      1.8,
      delta,
    )
  }
  const descriptionDistance = Math.hypot(
    avatar.position.x - descriptionPlane.position.x,
    avatar.position.z - descriptionPlane.position.z,
  )
  if (descriptionDistance < 3) descriptionTransitionTriggered = true
  if (descriptionTransitionTriggered) {
    descriptionTransitionProgress = THREE.MathUtils.damp(
      descriptionTransitionProgress,
      1,
      1.8,
      delta,
    )
  }
  const inspirationDistance = Math.hypot(
    avatar.position.x - inspirationPlane.position.x,
    avatar.position.z - inspirationPlane.position.z,
  )
  if (inspirationDistance < 3) inspirationTransitionTriggered = true
  if (inspirationTransitionTriggered) {
    inspirationTransitionProgress = THREE.MathUtils.damp(
      inspirationTransitionProgress,
      1,
      1.8,
      delta,
    )
  }
  const toolDistance = Math.hypot(
    avatar.position.x - toolPlane.position.x,
    avatar.position.z - toolPlane.position.z,
  )
  if (toolDistance < 3) toolTransitionTriggered = true
  if (toolTransitionTriggered) {
    toolTransitionProgress = THREE.MathUtils.damp(
      toolTransitionProgress,
      1,
      1.8,
      delta,
    )
  }
  titleMaterial.opacity = 1 - THREE.MathUtils.smoothstep(titleTransitionProgress, 0, 0.45)
  const nameFadeIn = THREE.MathUtils.smoothstep(titleTransitionProgress, 0.55, 1)
  const nameFadeOut = THREE.MathUtils.smoothstep(nameTransitionProgress, 0, 0.45)
  nameMaterial.opacity = nameFadeIn * (1 - nameFadeOut)
  const conceptFadeIn = THREE.MathUtils.smoothstep(nameTransitionProgress, 0.55, 1)
  const conceptFadeOut = THREE.MathUtils.smoothstep(conceptTransitionProgress, 0, 0.45)
  conceptMaterial.opacity = conceptFadeIn * (1 - conceptFadeOut)
  const descriptionFadeIn = THREE.MathUtils.smoothstep(conceptTransitionProgress, 0.55, 1)
  const descriptionFadeOut = THREE.MathUtils.smoothstep(descriptionTransitionProgress, 0, 0.45)
  descriptionMaterial.opacity = descriptionFadeIn * (1 - descriptionFadeOut)
  const inspirationFadeIn = THREE.MathUtils.smoothstep(descriptionTransitionProgress, 0.55, 1)
  const inspirationFadeOut = THREE.MathUtils.smoothstep(inspirationTransitionProgress, 0, 0.45)
  inspirationMaterial.opacity = inspirationFadeIn * (1 - inspirationFadeOut)
  const toolFadeIn = THREE.MathUtils.smoothstep(inspirationTransitionProgress, 0.55, 1)
  const toolFadeOut = THREE.MathUtils.smoothstep(toolTransitionProgress, 0, 0.45)
  toolMaterial.opacity = toolFadeIn * (1 - toolFadeOut)
  demoMaterial.opacity = THREE.MathUtils.smoothstep(toolTransitionProgress, 0.55, 1)

  sampleWorldColor(timer.getElapsed(), worldColor)
  soul.update(timer.getElapsed(), isWalking, worldColor)

  ambientLight.color.copy(worldColor).lerp(lightColor.set('#ffffff'), 0.18)
  ambientLight.groundColor.copy(worldColor).multiplyScalar(0.045)
  keyLight.color.copy(worldColor).lerp(lightColor.set('#ffffff'), 0.42)
  rimLight.color.copy(worldColor).multiplyScalar(1.15)

  controls.update()
  backdrop.update(camera.position, timer.getElapsed(), worldColor)
  fluidRibbons.update(timer.getElapsed(), avatar.position, worldColor)
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

animate()