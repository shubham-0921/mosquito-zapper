import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MosquitoPool } from './MosquitoPool'

interface Tier {
  at: number
  maxCount: number
  speed: number
}

const TIERS: Tier[] = [
  { at: 0,  maxCount: 2, speed: 1.0 },
  { at: 15, maxCount: 4, speed: 1.2 },
  { at: 30, maxCount: 6, speed: 1.5 },
  { at: 45, maxCount: 8, speed: 2.0 },
]

export class SpawnManager {
  private running = false
  private spawnInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    private pool: MosquitoPool,
    // Getter so it always returns the *current* active lamp position
    private getActiveLampPos: () => Vector3,
  ) {}

  start() {
    this.running = true
    // First mosquitoes appear right at the lit lamp — player instantly sees them
    this.spawnNearLight(TIERS[0].speed)
    this.spawnNearLight(TIERS[0].speed)
    this.spawnInterval = setInterval(() => {
      if (this.running) this.spawnNearLight(this.getCurrentSpeed())
    }, 3000)
  }

  update(elapsed: number) {
    if (!this.running) return
    const tier = this.getCurrentTier(elapsed)
    if (this.pool.activeCount() < tier.maxCount) {
      const nearLight = elapsed < 20 ? Math.random() < 0.7 : Math.random() < 0.4
      if (nearLight) {
        this.spawnNearLight(tier.speed)
      } else {
        this.spawnRandom(tier.speed)
      }
    }
  }

  private spawnNearLight(speed: number) {
    const lp = this.getActiveLampPos()
    const offset = new Vector3(
      (Math.random() - 0.5) * 1.2,
      Math.random() * 0.6,
      (Math.random() - 0.5) * 1.2,
    )
    this.pool.acquire(lp.add(offset), speed, lp)
  }

  private spawnRandom(speed: number) {
    const lp = this.getActiveLampPos()
    const pos = new Vector3(
      Math.random() * 8 - 4,
      Math.random() * 3 + 0.5,
      Math.random() * 8 - 4,
    )
    this.pool.acquire(pos, speed, lp)
  }

  private getCurrentTier(elapsed: number): Tier {
    let tier = TIERS[0]
    for (const t of TIERS) {
      if (elapsed >= t.at) tier = t
    }
    return tier
  }

  private getCurrentSpeed(): number {
    return this.getCurrentTier(0).speed
  }

  stop() {
    this.running = false
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval)
      this.spawnInterval = null
    }
  }
}
