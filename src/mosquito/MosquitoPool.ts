import { Scene } from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MosquitoAI } from './MosquitoAI'

const POOL_SIZE = 20

export class MosquitoPool {
  private pool: MosquitoAI[] = []
  private active: Set<MosquitoAI> = new Set()

  constructor(scene: Scene, detailed = true) {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(new MosquitoAI(scene, i, detailed))
    }
  }

  acquire(position: Vector3, speed: number, lightPos: Vector3): MosquitoAI | null {
    const available = this.pool.find(m => !m.isActive)
    if (!available) return null
    available.activate(position, speed, lightPos)
    this.active.add(available)
    return available
  }

  release(mosquito: MosquitoAI) {
    mosquito.deactivate()
    this.active.delete(mosquito)
  }

  releaseAll() {
    for (const m of [...this.active]) {
      this.release(m)
    }
  }

  updateAllLightPos(pos: Vector3) {
    for (const m of this.active) {
      m.updateLightPos(pos)
    }
  }

  updateAll(dt: number) {
    for (const m of this.active) {
      m.update(dt)
    }
  }

  getActiveMosquitoes(): MosquitoAI[] {
    return [...this.active]
  }

  activeCount(): number {
    return this.active.size
  }
}
