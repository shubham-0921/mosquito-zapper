import { Scene } from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera'

// Left-hand rest position in camera-local space
const REST_POS = new Vector3(-0.21, -0.26, 0.46)
const REST_ROT = new Vector3(0.06, -0.14, 0.07)

export class Flamethrower {
  private root:      TransformNode
  private nozzleTip: Mesh
  private meshes:    Mesh[] = []
  private particles: ParticleSystem

  isFlaming = false

  constructor(private scene: Scene, camera: UniversalCamera) {
    this.root = new TransformNode('ftRoot', scene)
    this.root.parent   = camera
    this.root.position = REST_POS.clone()
    this.root.rotation = REST_ROT.clone()

    // Invisible sphere at barrel tip — AbstractMesh accepted by ParticleSystem.emitter
    this.nozzleTip = MeshBuilder.CreateSphere('ftNozzleTip', { diameter: 0.01, segments: 2 }, scene)
    this.nozzleTip.parent   = this.root
    this.nozzleTip.position = new Vector3(0, 0.065, 0.70)
    this.nozzleTip.isVisible = false

    this.buildModel()
    this.particles = this.buildParticles()
    this.setVisible(false)
  }

  // ── 3-D model ──────────────────────────────────────────────────────
  private buildModel() {
    const s = this.scene

    const tankMat = new StandardMaterial('ftTankMat', s)
    tankMat.diffuseColor  = new Color3(0.22, 0.42, 0.16)   // olive green
    tankMat.specularColor = new Color3(0.25, 0.25, 0.25)
    tankMat.specularPower = 35

    // Main tank cylinder (horizontal)
    const tank = MeshBuilder.CreateCylinder('ftTank', { diameter: 0.11, height: 0.30, tessellation: 12 }, s)
    tank.parent     = this.root
    tank.position   = new Vector3(0, 0, 0.10)
    tank.rotation.x = Math.PI / 2
    tank.material   = tankMat
    this.meshes.push(tank)

    // Metal band rings around the tank
    const bandMat = new StandardMaterial('ftBandMat', s)
    bandMat.diffuseColor  = new Color3(0.14, 0.14, 0.14)
    bandMat.specularColor = new Color3(0.5, 0.5, 0.5)
    bandMat.specularPower = 60;
    [-0.09, 0.00, 0.09].forEach((z, i) => {
      const band = MeshBuilder.CreateCylinder(`ftBand${i}`, { diameter: 0.115, height: 0.016, tessellation: 12 }, s)
      band.parent     = this.root
      band.position   = new Vector3(0, 0, 0.10 + z)
      band.rotation.x = Math.PI / 2
      band.material   = bandMat
      this.meshes.push(band)
    })

    // Barrel pointing forward
    const barrelMat = new StandardMaterial('ftBarrelMat', s)
    barrelMat.diffuseColor  = new Color3(0.13, 0.13, 0.13)
    barrelMat.specularColor = new Color3(0.65, 0.65, 0.65)
    barrelMat.specularPower = 80

    const barrel = MeshBuilder.CreateCylinder('ftBarrel', { diameter: 0.036, height: 0.48, tessellation: 10 }, s)
    barrel.parent     = this.root
    barrel.position   = new Vector3(0, 0.063, 0.42)
    barrel.rotation.x = Math.PI / 2
    barrel.material   = barrelMat
    this.meshes.push(barrel)

    // Nozzle flare at the tip
    const nozzle = MeshBuilder.CreateCylinder('ftNozzle', { diameterTop: 0.052, diameterBottom: 0.036, height: 0.055, tessellation: 10 }, s)
    nozzle.parent     = this.root
    nozzle.position   = new Vector3(0, 0.063, 0.654)
    nozzle.rotation.x = Math.PI / 2
    nozzle.material   = barrelMat
    this.meshes.push(nozzle)

    // Grip / handle
    const gripMat = new StandardMaterial('ftGripMat', s)
    gripMat.diffuseColor = new Color3(0.11, 0.09, 0.07)

    const grip = MeshBuilder.CreateBox('ftGrip', { width: 0.040, height: 0.115, depth: 0.052 }, s)
    grip.parent     = this.root
    grip.position   = new Vector3(0, -0.062, 0.12)
    grip.rotation.x = 0.18
    grip.material   = gripMat
    this.meshes.push(grip)

    // Hose connecting tank to barrel
    const hose = MeshBuilder.CreateCylinder('ftHose', { diameter: 0.017, height: 0.12, tessellation: 7 }, s)
    hose.parent     = this.root
    hose.position   = new Vector3(0.016, 0.040, 0.29)
    hose.rotation.x = Math.PI / 2
    hose.material   = bandMat
    this.meshes.push(hose)
  }

  // ── Particle flame ─────────────────────────────────────────────────
  private buildParticles(): ParticleSystem {
    // Soft radial circle texture (same approach as VFXManager blood)
    const cvs = document.createElement('canvas')
    cvs.width = cvs.height = 64
    const ctx = cvs.getContext('2d')!
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0.0, 'rgba(255,255,255,1.0)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.85)')
    g.addColorStop(0.75, 'rgba(255,255,255,0.2)')
    g.addColorStop(1.0, 'rgba(255,255,255,0.0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    const tex = new Texture(cvs.toDataURL(), this.scene)

    const ps = new ParticleSystem('ftFlame', 300, this.scene)
    ps.particleTexture = tex
    ps.emitter = this.nozzleTip

    // isLocal = true makes direction relative to emitter orientation
    // so flames always spray along the barrel's forward axis
    ps.isLocal = true
    ps.direction1 = new Vector3(-0.12, -0.06, 1.0)
    ps.direction2 = new Vector3( 0.12,  0.18, 1.0)

    ps.minEmitPower = 6.0
    ps.maxEmitPower = 10.0

    // Deep orange → yellow → transparent
    ps.color1    = new Color4(1.0, 0.38, 0.0, 1.0)
    ps.color2    = new Color4(1.0, 0.72, 0.1, 1.0)
    ps.colorDead = new Color4(0.55, 0.08, 0.0, 0.0)

    ps.minSize     = 0.07;  ps.maxSize     = 0.24
    ps.minLifeTime = 0.16;  ps.maxLifeTime = 0.42
    ps.emitRate    = 200

    // Fire rises slightly
    ps.gravity   = new Vector3(0, 2.0, 0)
    ps.blendMode = ParticleSystem.BLENDMODE_ADD  // glowing additive fire

    return ps
  }

  // ── Public API ─────────────────────────────────────────────────────
  startFlame() {
    if (this.isFlaming) return
    this.isFlaming = true
    this.particles.start()
  }

  stopFlame() {
    if (!this.isFlaming) return
    this.isFlaming = false
    this.particles.stop()
  }

  setVisible(v: boolean) {
    this.meshes.forEach(m => (m.isVisible = v))
    if (!v) this.stopFlame()
  }

  getNozzlePosition(): Vector3 {
    return this.nozzleTip.getAbsolutePosition()
  }

  dispose() {
    this.stopFlame()
    this.particles.dispose()
    this.meshes.forEach(m => m.dispose())
    this.nozzleTip.dispose()
    this.root.dispose()
  }
}
