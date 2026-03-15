import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MosquitoAI } from '../mosquito/MosquitoAI'

const MAX_HP       = 50    // half bar — every bite matters
const DRAIN_RADIUS = 2.2   // larger bite range — harder to stay safe
const DRAIN_RATE   = 11    // HP/sec per mosquito at point-blank
const MAX_DRAIN    = 20    // cap so a swarm can't instant-kill

export class HealthManager {
  private hp = MAX_HP
  private dead = false

  private damageCallbacks: Array<() => void> = []
  private deathCallbacks:  Array<() => void> = []

  reset() {
    this.hp   = MAX_HP
    this.dead = false
  }

  update(dt: number, mosquitoes: MosquitoAI[], playerPos: Vector3) {
    if (this.dead) return

    let drain = 0
    for (const m of mosquitoes) {
      const dist = Vector3.Distance(playerPos, m.mesh.position)
      if (dist < DRAIN_RADIUS) {
        // Linear falloff: full drain at dist=0, zero at DRAIN_RADIUS
        drain += DRAIN_RATE * (1 - dist / DRAIN_RADIUS)
      }
    }

    drain = Math.min(drain, MAX_DRAIN)

    if (drain > 0) {
      this.hp = Math.max(0, this.hp - drain * dt)
      this.damageCallbacks.forEach(cb => cb())

      if (this.hp <= 0 && !this.dead) {
        this.dead = true
        this.deathCallbacks.forEach(cb => cb())
      }
    }
  }

  heal(amount: number) {
    if (this.dead) return
    this.hp = Math.min(MAX_HP, this.hp + amount)
  }

  getHP():    number  { return this.hp }
  getMaxHP(): number  { return MAX_HP }
  isDead():   boolean { return this.dead }

  onDamage(cb: () => void)  { this.damageCallbacks.push(cb) }
  onDeath (cb: () => void)  { this.deathCallbacks.push(cb)  }
}
