import { isMobile } from '../input/DeviceDetect'
import { Scene } from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'

export class VFXManager {
  private comboOverlay: HTMLDivElement
  private circleTex: Texture    // soft circle — used for blood droplets
  private whiteTex: Texture     // 1×1 white — used for arc sparks

  constructor(private scene: Scene) {
    this.circleTex = this.makeCircleTex()
    this.whiteTex  = new Texture(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
      scene,
    )

    this.comboOverlay = document.createElement('div')
    this.comboOverlay.style.cssText = `
      position: fixed; inset: 0;
      pointer-events: none;
      display: flex; align-items: center; justify-content: center;
      font-size: 3rem; font-weight: bold;
      color: #FFD600; text-shadow: 0 0 20px #FF6F00;
      opacity: 0; transition: opacity 0.15s; z-index: 50;
    `
    document.body.appendChild(this.comboOverlay)
  }

  // ── Electric arc on zap ──────────────────────────────────────────
  spawnArc(position: Vector3) {
    const ps = new ParticleSystem('arc', 60, this.scene)
    ps.particleTexture = this.whiteTex

    ps.emitter    = position.clone()
    ps.minEmitBox = new Vector3(-0.04, -0.04, -0.04)
    ps.maxEmitBox = new Vector3( 0.04,  0.04,  0.04)

    ps.color1    = new Color4(0.7, 0.9, 1.0, 1)
    ps.color2    = new Color4(0.3, 0.7, 1.0, 1)
    ps.colorDead = new Color4(0.0, 0.2, 0.6, 0)

    ps.minSize = 0.015; ps.maxSize = 0.07
    ps.minLifeTime = 0.08; ps.maxLifeTime = 0.22
    ps.emitRate = 600
    ps.minEmitPower = 0.5; ps.maxEmitPower = 2.5
    ps.direction1 = new Vector3(-1, -1, -1)
    ps.direction2 = new Vector3( 1,  1,  1)
    ps.gravity    = new Vector3(0, -2, 0)
    ps.blendMode  = ParticleSystem.BLENDMODE_ADD

    ps.start()
    setTimeout(() => { ps.stop(); setTimeout(() => ps.dispose(), 400) }, 120)
  }

  // ── Blood splatter: 3-in-1 effect ───────────────────────────────
  spawnBlood(position: Vector3) {
    this.spawnBloodParticles(position)
    if (!isMobile()) this.spawnBloodPool(position)
    if (!isMobile()) this.spawnScreenBlood()
  }

  // 3D particle burst — red droplets fly outward then fall
  private spawnBloodParticles(position: Vector3) {
    const ps = new ParticleSystem('blood', isMobile() ? 40 : 160, this.scene)
    ps.particleTexture = this.circleTex

    ps.emitter    = position.clone()
    ps.minEmitBox = new Vector3(-0.03, -0.03, -0.03)
    ps.maxEmitBox = new Vector3( 0.03,  0.03,  0.03)

    // Deep red → dark crimson → near-black when dying
    ps.color1    = new Color4(0.80, 0.03, 0.03, 1.0)
    ps.color2    = new Color4(0.55, 0.01, 0.01, 1.0)
    ps.colorDead = new Color4(0.10, 0.00, 0.00, 0.0)

    ps.minSize = 0.018; ps.maxSize = 0.075
    ps.minLifeTime = 0.35; ps.maxLifeTime = 1.1

    ps.emitRate = 800
    // Spray in all directions — gravity pulls them back to the floor
    ps.direction1 = new Vector3(-2.0, -0.5, -2.0)
    ps.direction2 = new Vector3( 2.0,  3.5,  2.0)
    ps.minEmitPower = 1.0; ps.maxEmitPower = 4.5
    ps.gravity = new Vector3(0, -12, 0)   // strong gravity → dramatic arc

    // Standard blend so blood is opaque, not glowing
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD

    ps.start()
    setTimeout(() => { ps.stop(); setTimeout(() => ps.dispose(), 1500) }, 120)
  }

  // Flat blood pool that expands on the floor then fades out
  private spawnBloodPool(killPos: Vector3) {
    const pool = MeshBuilder.CreateDisc('bPool', { radius: 1, tessellation: 20 }, this.scene)
    pool.rotation.x = Math.PI / 2
    pool.position   = new Vector3(killPos.x, 0.005, killPos.z)
    pool.scaling    = new Vector3(0.001, 0.001, 0.001)

    const mat = new StandardMaterial('bPoolMat' + Date.now(), this.scene)
    mat.diffuseColor = new Color3(0.30, 0.00, 0.00)
    mat.emissiveColor = new Color3(0.08, 0.00, 0.00)
    mat.alpha = 0.88
    pool.material = mat

    const targetR = 0.12 + Math.random() * 0.10   // 0.12–0.22 m radius
    let elapsed = 0

    const tick = () => {
      const dt = this.scene.getEngine().getDeltaTime() / 1000
      elapsed += dt

      if (elapsed < 0.28) {
        // Expand phase — overshoot slightly then settle (elastic feel)
        const p  = elapsed / 0.28
        const sc = targetR * (p < 0.7 ? p / 0.7 : 1 + 0.15 * Math.sin((p - 0.7) / 0.3 * Math.PI))
        pool.scaling.x = sc
        pool.scaling.z = sc
      } else {
        // Fade phase — over ~6 seconds
        const fadeT = (elapsed - 0.28) / 6.0
        mat.alpha = 0.88 * Math.max(0, 1 - fadeT)
        if (fadeT >= 1) {
          this.scene.unregisterBeforeRender(tick)
          pool.dispose()
          return
        }
      }
    }

    this.scene.registerBeforeRender(tick)
  }

  // CSS blood drops that appear on the lens and drip downward
  private spawnScreenBlood() {
    const count = 3 + Math.floor(Math.random() * 4)

    for (let i = 0; i < count; i++) {
      const drop = document.createElement('div')

      const w    = 8 + Math.random() * 22          // px width
      const h    = w * (1.6 + Math.random() * 1.8) // taller than wide
      const left = Math.random() * 92              // % from left
      const top  = Math.random() * 75              // % from top (avoid bottom bar)
      const rot  = Math.random() * 50 - 25         // slight rotation

      drop.style.cssText = `
        position: fixed;
        left: ${left}%;
        top: ${top}%;
        width: ${w}px;
        height: ${h}px;
        background: radial-gradient(ellipse 60% 40% at 50% 30%,
          #CC0000 0%, #7A0000 55%, #3D0000 85%, transparent 100%);
        border-radius: 50% 50% 60% 60% / 35% 35% 65% 65%;
        transform: rotate(${rot}deg) translateY(0px);
        pointer-events: none;
        z-index: 99;
        opacity: 0.88;
        transition: opacity 1.4s ease-out, transform 1.4s ease-out;
      `
      document.body.appendChild(drop)

      // Next frame: start drip + fade
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          drop.style.opacity   = '0'
          drop.style.transform = `rotate(${rot}deg) translateY(${18 + Math.random() * 22}px)`
        })
      })

      setTimeout(() => drop.remove(), 1600)
    }
  }

  flashCombo(text: string) {
    this.comboOverlay.textContent = text
    this.comboOverlay.style.opacity = '1'
    setTimeout(() => { this.comboOverlay.style.opacity = '0' }, 600)
  }

  // Soft radial gradient texture for round blood droplets
  private makeCircleTex(): Texture {
    const size = 64
    const cvs  = document.createElement('canvas')
    cvs.width  = size
    cvs.height = size
    const ctx  = cvs.getContext('2d')!
    const g    = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0.0, 'rgba(255,255,255,1.0)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.8, 'rgba(255,255,255,0.4)')
    g.addColorStop(1.0, 'rgba(255,255,255,0.0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    return new Texture(cvs.toDataURL(), this.scene)
  }
}
