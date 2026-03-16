import { Scene } from '@babylonjs/core/scene'
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { Flamethrower } from './Flamethrower'

// ── Glow colours ────────────────────────────────────────────────────
const GRID_IDLE   = new Color3(0.03, 0.08, 0.22)
const GRID_FLASH  = new Color3(0.40, 0.90, 1.00)
const FRAME_IDLE  = Color3.Black()
const FRAME_FLASH = new Color3(0.10, 0.65, 0.20)

// ── Rest pose in camera-local space ────────────────────────────────
// +X right, +Y up, +Z into scene (camera forward)
const REST_POS = new Vector3( 0.21, -0.27, 0.50)
const REST_ROT = new Vector3(-0.42,  0.28, 0.24)   // tilt face, angle inward, wrist roll

export class PlayerController {
  private camera: UniversalCamera
  private racketRoot: TransformNode
  private swingCallbacks: Array<() => void> = []
  private flameStartCallbacks: Array<() => void> = []
  private flameStopCallbacks:  Array<() => void> = []
  private isEnabled = false

  private flamethrower: Flamethrower | null = null

  private _onFKeyDown = (e: KeyboardEvent) => {
    if (e.code !== 'KeyF' || e.repeat || !this.flamethrower) return
    this.flamethrower.startFlame()
    this.flameStartCallbacks.forEach(cb => cb())
  }
  private _onFKeyUp = (e: KeyboardEvent) => {
    if (e.code !== 'KeyF' || !this.flamethrower) return
    this.flamethrower.stopFlame()
    this.flameStopCallbacks.forEach(cb => cb())
  }

  private _onCanvasClick = () => {
    if (document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock()
    }
  }

  private swingAnimT  = 0
  private isSwinging  = false
  private racketMeshes: Mesh[] = []

  // Glow
  private gridMat!:  StandardMaterial
  private frameMat!: StandardMaterial
  private killGlowT  = 0
  private glowLight!: PointLight

  constructor(private scene: Scene, private canvas: HTMLCanvasElement) {
    // Must be focusable for keyboard events to fire on the canvas element
    canvas.tabIndex = 0

    this.camera = new UniversalCamera('playerCam', new Vector3(0, 1.7, 0), scene)
    this.camera.setTarget(new Vector3(0, 1.7, -1))
    this.camera.minZ             = 0.1
    this.camera.speed            = 0.15
    this.camera.angularSensibility = 800
    this.camera.keysUp    = [87]
    this.camera.keysDown  = [83]
    this.camera.keysLeft  = [65]
    this.camera.keysRight = [68]

    // Parent racket to camera so position/rotation is camera-local
    this.racketRoot = new TransformNode('racketRoot', scene)
    this.racketRoot.parent   = this.camera
    this.racketRoot.position = REST_POS.clone()
    this.racketRoot.rotation = REST_ROT.clone()

    this.buildRacket()
    scene.registerBeforeRender(() => this.tick())
  }

  // ── Mesh construction ──────────────────────────────────────────────
  private buildRacket() {
    const scene = this.scene

    // Materials
    const rubberMat = new StandardMaterial('rRubber', scene)
    rubberMat.diffuseColor  = new Color3(0.04, 0.04, 0.04)
    rubberMat.specularColor = new Color3(0.15, 0.15, 0.15)

    const gripMat = new StandardMaterial('rGrip', scene)
    gripMat.diffuseColor  = new Color3(0.06, 0.30, 0.06)
    gripMat.specularColor = new Color3(0.20, 0.20, 0.20)

    const gripDarkMat = new StandardMaterial('rGripDark', scene)
    gripDarkMat.diffuseColor = new Color3(0.03, 0.18, 0.03)

    const collarMat = new StandardMaterial('rCollar', scene)
    collarMat.diffuseColor  = new Color3(0.60, 0.62, 0.60)
    collarMat.specularColor = new Color3(1.00, 1.00, 1.00)
    collarMat.specularPower = 80

    const frameMat = new StandardMaterial('rFrame', scene)
    frameMat.diffuseColor  = new Color3(0.06, 0.62, 0.10)
    frameMat.specularColor = new Color3(0.50, 0.50, 0.50)
    frameMat.specularPower = 40
    frameMat.emissiveColor = FRAME_IDLE.clone()
    this.frameMat = frameMat

    const gridMat = new StandardMaterial('rGrid', scene)
    gridMat.diffuseColor  = new Color3(0.55, 0.78, 0.95)
    gridMat.specularColor = new Color3(1.00, 1.00, 1.00)
    gridMat.specularPower = 256
    gridMat.emissiveColor = GRID_IDLE.clone()
    this.gridMat = gridMat

    const innerRingMat = new StandardMaterial('rInner', scene)
    innerRingMat.diffuseColor  = new Color3(0.05, 0.50, 0.08)
    innerRingMat.specularColor = new Color3(0.40, 0.40, 0.40)

    const mk = (n: string) => `rk_${n}`

    // ── Handle ───────────────────────────────────────────────────────
    // Everything hangs from racketRoot (local Y = up in camera space)
    // Handle goes downward (-Y) from root origin

    // Butt cap
    const cap = MeshBuilder.CreateSphere(mk('cap'), { diameter: 0.046, segments: 8 }, scene)
    cap.parent     = this.racketRoot
    cap.position.y = -0.305
    cap.material   = rubberMat
    this.racketMeshes.push(cap)

    // Main grip body
    const grip = MeshBuilder.CreateCylinder(mk('grip'), { diameter: 0.038, height: 0.22 }, scene)
    grip.parent     = this.racketRoot
    grip.position.y = -0.185
    grip.material   = gripMat
    this.racketMeshes.push(grip)

    // Grip tape bands — alternating dark/green stripes
    const bandYs = [-0.26, -0.23, -0.20, -0.17, -0.14, -0.11]
    bandYs.forEach((by, i) => {
      const band = MeshBuilder.CreateCylinder(mk(`band${i}`), {
        diameter: 0.042, height: 0.010,
      }, scene)
      band.parent     = this.racketRoot
      band.position.y = by
      band.material   = i % 2 === 0 ? gripDarkMat : gripMat
      this.racketMeshes.push(band)
    })

    // Throat / collar
    const collar = MeshBuilder.CreateCylinder(mk('collar'), { diameter: 0.056, height: 0.038 }, scene)
    collar.parent     = this.racketRoot
    collar.position.y = -0.018
    collar.material   = collarMat
    this.racketMeshes.push(collar)

    // Neck taper — connects collar to head frame
    const neck = MeshBuilder.CreateCylinder(mk('neck'), {
      diameterTop: 0.022, diameterBottom: 0.044, height: 0.055, tessellation: 12,
    }, scene)
    neck.parent     = this.racketRoot
    neck.position.y = 0.045
    neck.material   = collarMat
    this.racketMeshes.push(neck)

    // ── Head frame — oval torus ───────────────────────────────────────
    // CreateTorus axis is Y by default (hole along Y).
    // Rotate 90° around X so the hole (and face) aligns with local Z (camera forward).
    // Then scale Y > 1 to make it oval (taller than wide) — real racket shape.
    const outerFrame = MeshBuilder.CreateTorus(mk('outerFrame'), {
      diameter: 0.29, thickness: 0.017, tessellation: 40,
    }, scene)
    outerFrame.parent     = this.racketRoot
    outerFrame.position.y = 0.225
    outerFrame.rotation.x = Math.PI / 2
    outerFrame.scaling    = new Vector3(1.0, 1.32, 1.0)  // oval: 0.29 wide × 0.38 tall
    outerFrame.material   = frameMat
    this.racketMeshes.push(outerFrame)

    // Inner support ring (slightly smaller oval)
    const innerFrame = MeshBuilder.CreateTorus(mk('innerFrame'), {
      diameter: 0.22, thickness: 0.009, tessellation: 36,
    }, scene)
    innerFrame.parent     = this.racketRoot
    innerFrame.position.y = 0.225
    innerFrame.rotation.x = Math.PI / 2
    innerFrame.scaling    = new Vector3(1.0, 1.32, 1.0)
    innerFrame.material   = innerRingMat
    this.racketMeshes.push(innerFrame)

    // ── Electric grid — clipped to inner oval ────────────────────────
    // Inner ellipse half-axes (world-ish units, before scaling):
    //   half-width  a = 0.22/2 * 1.0  = 0.110  (X direction)
    //   half-height b = 0.22/2 * 1.32 = 0.145  (Y direction)
    // But torus scaling applies to the ring itself — the inner clear area is
    // (diameter/2 - thickness/2) = (0.11 - 0.0045) = 0.1055 radius, scaled.
    // Approximate usable inner ellipse:
    const a = 0.098   // half-width  (X)
    const b = 0.130   // half-height (Y)
    const WIRE = 0.0038

    // 8 horizontal wires
    const hCount = 8
    for (let i = 0; i < hCount; i++) {
      const wy = -b + (2 * b / (hCount + 1)) * (i + 1)   // evenly spaced, excluding edges
      const halfW = a * Math.sqrt(Math.max(0, 1 - (wy / b) ** 2)) * 0.97
      if (halfW < 0.005) continue
      const w = MeshBuilder.CreateBox(mk(`hw${i}`), { width: halfW * 2, height: WIRE, depth: WIRE }, scene)
      w.parent     = this.racketRoot
      w.position   = new Vector3(0, 0.225 + wy, 0)
      w.material   = gridMat
      this.racketMeshes.push(w)
    }

    // 8 vertical wires
    const vCount = 8
    for (let i = 0; i < vCount; i++) {
      const wx = -a + (2 * a / (vCount + 1)) * (i + 1)
      const halfH = b * Math.sqrt(Math.max(0, 1 - (wx / a) ** 2)) * 0.97
      if (halfH < 0.005) continue
      const w = MeshBuilder.CreateBox(mk(`vw${i}`), { width: WIRE, height: halfH * 2, depth: WIRE }, scene)
      w.parent     = this.racketRoot
      w.position   = new Vector3(wx, 0.225, 0)
      w.material   = gridMat
      this.racketMeshes.push(w)
    }

    // ── Kill glow light ───────────────────────────────────────────────
    this.glowLight = new PointLight(mk('glow'), new Vector3(0, 0.225, 0.05), scene)
    this.glowLight.parent    = this.racketRoot
    this.glowLight.diffuse   = new Color3(0.35, 0.85, 1.0)
    this.glowLight.specular  = new Color3(0.35, 0.85, 1.0)
    this.glowLight.intensity = 0
    this.glowLight.range     = 5
  }

  // ── Kill glow (called by HitDetection) ────────────────────────────
  triggerKillGlow() {
    this.killGlowT             = 1.0
    this.gridMat.emissiveColor = GRID_FLASH.clone()
    this.frameMat.emissiveColor = FRAME_FLASH.clone()
    this.glowLight.intensity   = 1.5
  }

  // ── Per-frame update ──────────────────────────────────────────────
  private tick() {
    if (!this.isEnabled) return
    const dt = this.scene.getEngine().getDeltaTime() / 1000

    // Swing — horizontal forehand sweep (Y rotation in camera space)
    if (this.isSwinging) {
      this.swingAnimT += dt / 0.18   // 180ms arc
      const arc = Math.sin(this.swingAnimT * Math.PI)
      // Sweep inward (Y), slight downward follow-through (X)
      this.racketRoot.rotation.y = REST_ROT.y - arc * 1.1
      this.racketRoot.rotation.x = REST_ROT.x - arc * 0.25
      if (this.swingAnimT >= 1) {
        this.isSwinging = false
        this.swingAnimT = 0
        this.racketRoot.rotation.x = REST_ROT.x
        this.racketRoot.rotation.y = REST_ROT.y
      }
    }

    // Glow fade
    if (this.killGlowT > 0) {
      this.killGlowT = Math.max(0, this.killGlowT - dt / 0.45)
      const t = this.killGlowT
      this.gridMat.emissiveColor  = Color3.Lerp(GRID_IDLE,  GRID_FLASH,  t)
      this.frameMat.emissiveColor = Color3.Lerp(FRAME_IDLE, FRAME_FLASH, t)
      this.glowLight.intensity    = 1.5 * t
    }

    // Room bounds
    const pos = this.camera.position
    pos.x = Math.max(-4.5, Math.min(4.5, pos.x))
    pos.z = Math.max(-4.5, Math.min(4.5, pos.z))
    pos.y = 1.7
  }

  // ── Mobile input API (called by TouchControls) ───────────────────
  /** Move camera based on normalised joystick vector [-1..1] */
  applyMoveInput(x: number, z: number, dt: number) {
    const speed = 4.5 * dt
    const fwd   = this.camera.getDirection(new Vector3(0, 0, 1))
    const right = this.camera.getDirection(new Vector3(1, 0, 0))
    fwd.y = 0;   if (fwd.length()   > 0.001) fwd.normalize()
    right.y = 0; if (right.length() > 0.001) right.normalize()
    this.camera.position.addInPlace(fwd.scale(z * speed))
    this.camera.position.addInPlace(right.scale(x * speed))
  }

  /** Rotate camera from touch drag delta (already in radians) */
  applyLookDelta(dx: number, dy: number) {
    this.camera.rotation.y += dx
    this.camera.rotation.x = Math.max(-1.1, Math.min(1.1, this.camera.rotation.x + dy))
  }

  /** Enable for mobile — shows racket but skips keyboard/mouse attachment */
  enableMobile() {
    this.isEnabled = true
    this.racketMeshes.forEach(m => (m.isVisible = true))
  }

  // ── Public API ────────────────────────────────────────────────────
  private sensitivityToAngular(val: number): number {
    // Slider 1 (slowest) → angularSensibility 2500, 10 (fastest) → 200
    // Babylon.js: lower angularSensibility = faster rotation
    return Math.round(2500 - (val - 1) * (2300 / 9))
  }

  enable() {
    const sens = parseInt(localStorage.getItem('mz_sensitivity') ?? '3', 10)
    this.camera.angularSensibility = this.sensitivityToAngular(sens)
    this.isEnabled = true
    this.camera.attachControl(this.canvas, true)
    this.racketMeshes.forEach(m => (m.isVisible = true))

    // Give the canvas keyboard focus so WASD fires immediately
    this.canvas.focus()

    // Request pointer lock so mouse movement steers the camera without holding a button
    this.canvas.requestPointerLock()
    this.canvas.addEventListener('click', this._onCanvasClick)
    window.addEventListener('keydown', this._onFKeyDown)
    window.addEventListener('keyup',   this._onFKeyUp)

    if (this.flamethrower) this.flamethrower.setVisible(true)

    this.scene.onPointerDown = (evt) => {
      if (evt.button === 0) {
        if (document.pointerLockElement !== this.canvas) {
          // Not locked yet — first click just acquires the lock
          this.canvas.requestPointerLock()
        } else {
          this.triggerSwing()
        }
      }
    }
  }

  disable() {
    this.isEnabled = false
    this.camera.detachControl()
    this.racketMeshes.forEach(m => (m.isVisible = false))
    this.scene.onPointerDown = undefined
    this.canvas.removeEventListener('click', this._onCanvasClick)
    window.removeEventListener('keydown', this._onFKeyDown)
    window.removeEventListener('keyup',   this._onFKeyUp)
    if (document.pointerLockElement === this.canvas) document.exitPointerLock()
    if (this.flamethrower) this.flamethrower.setVisible(false)
  }

  triggerSwing() {
    if (this.isSwinging) return   // no re-trigger mid-swing
    this.isSwinging = true
    this.swingAnimT = 0
    this.swingCallbacks.forEach(cb => cb())
  }

  onSwing(cb: () => void)      { this.swingCallbacks.push(cb) }
  onFlameStart(cb: () => void) { this.flameStartCallbacks.push(cb) }
  onFlameStop(cb: () => void)  { this.flameStopCallbacks.push(cb) }

  unlockFlamethrower() {
    if (this.flamethrower) return
    this.flamethrower = new Flamethrower(this.scene, this.camera)
    if (this.isEnabled) this.flamethrower.setVisible(true)
  }

  isFlaming(): boolean { return this.flamethrower?.isFlaming ?? false }

  /** World-space position of the racket head (used by hit detection) */
  getRacketPosition(): Vector3 {
    return this.racketRoot.getAbsolutePosition()
  }

  getCameraForward(): Vector3 { return this.camera.getDirection(Vector3.Forward()) }
  getPosition():      Vector3 { return this.camera.position.clone() }
}
