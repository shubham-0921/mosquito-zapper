import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'

export interface LampData {
  position: Vector3
  light: PointLight
  bulbMat: StandardMaterial
  shadeMat: StandardMaterial
}

export class LampManager {
  private lamps: LampData[] = []
  private activeIndex = -1
  private switchTimer = 0
  private switchInterval = 10
  private switchCallbacks: Array<(pos: Vector3) => void> = []

  addLamp(lamp: LampData) {
    this.lamps.push(lamp)
  }

  // Call once when game starts — pick first active lamp
  start() {
    // Deactivate all first
    this.lamps.forEach((_, i) => this.deactivateLamp(i))
    const startIdx = Math.floor(Math.random() * this.lamps.length)
    this.activateLamp(startIdx)
    this.switchTimer = 0
    this.switchInterval = 3 + Math.random() * 3
  }

  update(dt: number) {
    this.switchTimer += dt
    if (this.switchTimer >= this.switchInterval) {
      this.switchTimer = 0
      this.switchInterval = 3 + Math.random() * 3
      let next = this.activeIndex
      while (next === this.activeIndex) {
        next = Math.floor(Math.random() * this.lamps.length)
      }
      this.deactivateLamp(this.activeIndex)
      this.activateLamp(next)
    }
  }

  // Turn all lamps on at softer intensity — used for title / results screens
  illuminate() {
    this.lamps.forEach((lamp) => {
      lamp.light.setEnabled(true)
      lamp.light.intensity = 0.8
      lamp.bulbMat.emissiveColor  = new Color3(1.0, 0.9, 0.5)
      lamp.shadeMat.emissiveColor = new Color3(0.35, 0.24, 0.04)
    })
  }

  // Also call on stop so all lamps go dark
  stop() {
    this.lamps.forEach((_, i) => this.deactivateLamp(i))
  }

  private activateLamp(index: number) {
    this.activeIndex = index
    const lamp = this.lamps[index]
    lamp.light.setEnabled(true)
    lamp.light.intensity = 1.5
    lamp.bulbMat.emissiveColor = new Color3(1.0, 0.9, 0.5)
    lamp.shadeMat.emissiveColor = new Color3(0.45, 0.32, 0.05)
    this.switchCallbacks.forEach(cb => cb(lamp.position.clone()))
  }

  private deactivateLamp(index: number) {
    if (index < 0 || index >= this.lamps.length) return
    const lamp = this.lamps[index]
    lamp.light.setEnabled(false)
    lamp.bulbMat.emissiveColor = new Color3(0.05, 0.04, 0.02)
    lamp.shadeMat.emissiveColor = Color3.Black()
  }

  getActiveLampPosition(): Vector3 {
    if (this.activeIndex < 0) return Vector3.Zero()
    return this.lamps[this.activeIndex].position.clone()
  }

  onSwitch(cb: (pos: Vector3) => void) {
    this.switchCallbacks.push(cb)
  }
}
