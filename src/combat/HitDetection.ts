import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { PlayerController } from '../player/PlayerController'
import { MosquitoPool } from '../mosquito/MosquitoPool'
import { ScoreManager } from '../scoring/ScoreManager'
import { AudioManager } from '../audio/AudioManager'
import { VFXManager } from '../vfx/VFXManager'

const HIT_RADIUS      = 0.8
const COOLDOWN_MS     = 200
const FLAME_RANGE     = 3.5   // metres
const FLAME_DOT       = 0.78  // ~cos(39°) — wide enough to feel satisfying
const FLAME_KILL_MS   = 140   // min ms between flame kills

export class HitDetection {
  private lastSwingTime = 0
  private pendingSwing  = false
  private lastFlameKill = 0

  constructor(
    private player: PlayerController,
    private pool: MosquitoPool,
    private score: ScoreManager,
    private audio: AudioManager,
    private vfx: VFXManager,
  ) {
    player.onSwing(() => {
      this.pendingSwing = true
    })
  }

  update() {
    this.checkFlame()

    if (!this.pendingSwing) return
    this.pendingSwing = false

    const now = Date.now()
    if (now - this.lastSwingTime < COOLDOWN_MS) return
    this.lastSwingTime = now

    const racket = this.player.getRacketPosition()
    const camPos = this.player.getPosition()
    const forward = this.player.getCameraForward()

    for (const mosquito of this.pool.getActiveMosquitoes().slice()) {
      const mPos = mosquito.mesh.position
      const dist = Vector3.Distance(racket, mPos)

      // Also check forward cone from camera
      const toCam = mPos.subtract(camPos)
      const dot = Vector3.Dot(toCam.normalize(), forward)
      const camDist = toCam.length()

      if (dist < HIT_RADIUS || (dot > 0.85 && camDist < 3)) {
        this.pool.release(mosquito)
        this.score.registerKill()
        this.audio.playZap()
        this.vfx.spawnArc(mPos)
        this.vfx.spawnBlood(mPos)
        this.player.triggerKillGlow()
        break // one hit per swing
      }
    }
  }

  private checkFlame() {
    if (!this.player.isFlaming()) return
    const now = Date.now()
    if (now - this.lastFlameKill < FLAME_KILL_MS) return

    const camPos = this.player.getPosition()
    const forward = this.player.getCameraForward()

    for (const mosquito of this.pool.getActiveMosquitoes().slice()) {
      const toMq = mosquito.mesh.position.subtract(camPos)
      const dist  = toMq.length()
      if (dist > FLAME_RANGE) continue
      if (Vector3.Dot(toMq.normalize(), forward) < FLAME_DOT) continue

      this.lastFlameKill = now
      this.pool.release(mosquito)
      this.score.registerKill()
      this.audio.playZap()
      this.vfx.spawnArc(mosquito.mesh.position.clone())
      this.vfx.spawnBlood(mosquito.mesh.position.clone())
      break  // one kill per interval — keeps it fair
    }
  }
}
