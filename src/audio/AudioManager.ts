import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MosquitoAI } from '../mosquito/MosquitoAI'

export class AudioManager {
  private ctx: AudioContext | null = null
  private buzzNodes: Map<MosquitoAI, OscillatorNode> = new Map()
  private buzzGains: Map<MosquitoAI, GainNode> = new Map()
  private masterGain!: GainNode

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
    }
    return this.ctx
  }

  startAmbience() {
    // Will be driven by update()
  }

  stopAmbience() {
    for (const [mosquito] of this.buzzNodes) {
      this.stopBuzz(mosquito)
    }
  }

  update(mosquitoes: MosquitoAI[], playerPos: Vector3) {
    if (!this.ctx) return
    const ctx = this.ctx

    const activeSet = new Set(mosquitoes)

    // Remove buzz for dead mosquitoes
    for (const [m] of this.buzzNodes) {
      if (!activeSet.has(m)) {
        this.stopBuzz(m)
      }
    }

    // Add/update buzz for active ones
    for (const m of mosquitoes) {
      if (!this.buzzNodes.has(m)) {
        this.startBuzz(m)
      }
      const gain = this.buzzGains.get(m)
      if (gain) {
        const dist = Vector3.Distance(playerPos, m.mesh.position)
        gain.gain.setTargetAtTime(1 / (1 + dist * dist * 0.5), ctx.currentTime, 0.1)
      }
    }
  }

  private startBuzz(m: MosquitoAI) {
    const ctx = this.getCtx()
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 580 + Math.random() * 40

    const gain = ctx.createGain()
    gain.gain.value = 0.15

    // FM modulation
    const fmOsc = ctx.createOscillator()
    fmOsc.frequency.value = 200
    const fmGain = ctx.createGain()
    fmGain.gain.value = 30
    fmOsc.connect(fmGain)
    fmGain.connect(osc.frequency)
    fmOsc.start()

    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start()
    this.buzzNodes.set(m, osc)
    this.buzzGains.set(m, gain)
  }

  private stopBuzz(m: MosquitoAI) {
    const osc = this.buzzNodes.get(m)
    const gain = this.buzzGains.get(m)
    if (osc) {
      try { osc.stop() } catch (_) { /* already stopped */ }
      this.buzzNodes.delete(m)
    }
    if (gain) {
      this.buzzGains.delete(m)
    }
  }

  playZap() {
    const ctx = this.getCtx()

    // Sawtooth oscillator
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 180

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

    // Highpass filter
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 1200

    // Distortion
    const distortion = ctx.createWaveShaper()
    distortion.curve = this.makeDistortionCurve(200)

    osc.connect(gain)
    gain.connect(filter)
    filter.connect(distortion)
    distortion.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const samples = 256
    const curve = new Float32Array(samples)
    const deg = Math.PI / 180
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
    }
    return curve
  }
}
