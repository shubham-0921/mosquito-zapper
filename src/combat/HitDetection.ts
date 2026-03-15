import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { PlayerController } from '../player/PlayerController'
import { MosquitoPool } from '../mosquito/MosquitoPool'
import { ScoreManager } from '../scoring/ScoreManager'
import { AudioManager } from '../audio/AudioManager'
import { VFXManager } from '../vfx/VFXManager'

const HIT_RADIUS = 0.8
const COOLDOWN_MS = 200

export class HitDetection {
  private lastSwingTime = 0
  private pendingSwing = false

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
    if (!this.pendingSwing) return
    this.pendingSwing = false

    const now = Date.now()
    if (now - this.lastSwingTime < COOLDOWN_MS) return
    this.lastSwingTime = now

    const racket = this.player.getRacketPosition()
    const camPos = this.player.getPosition()
    const forward = this.player.getCameraForward()

    for (const mosquito of this.pool.getActiveMosquitoes()) {
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
}
