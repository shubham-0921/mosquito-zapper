import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MosquitoAI } from '../mosquito/MosquitoAI'

// ── Chiptune sequencer ────────────────────────────────────────────────
const BPM        = 160
const STEP       = 60 / BPM / 4    // 16th-note duration in seconds
const LOOK_AHEAD = 0.25            // schedule this far ahead

// 32-step pattern (2 bars of 4/4 in 16ths)
// Lead melody — square wave
const LEAD: number[] = [
  783.99, 659.25, 523.25, 659.25,   // G5 E5 C5 E5
  783.99, 783.99, 880.00, 783.99,   // G5 G5 A5 G5
  659.25, 0,      698.46, 659.25,   // E5 _  F5 E5
  587.33, 0,      587.33, 0,        // D5 _  D5 _
  523.25, 659.25, 783.99, 659.25,   // C5 E5 G5 E5
  523.25, 880.00, 0,      783.99,   // C5 A5 _  G5
  698.46, 659.25, 587.33, 523.25,   // F5 E5 D5 C5
  659.25, 0,      0,      0,        // E5 _  _  _
]

// Bass — triangle wave (quarter notes, one per 4 steps)
const BASS: number[] = [
  130.81, 0, 0, 0,   // C3
  196.00, 0, 0, 0,   // G3
  220.00, 0, 0, 0,   // A3
  164.81, 0, 0, 0,   // E3
  174.61, 0, 0, 0,   // F3
  130.81, 0, 0, 0,   // C3
  196.00, 0, 0, 0,   // G3
  130.81, 0, 0, 0,   // C3
]

export class AudioManager {
  private ctx: AudioContext | null = null
  private masterGain!: GainNode

  // Music scheduler
  private scheduleTimer: ReturnType<typeof setInterval> | null = null
  private nextNoteTime  = 0
  private stepIndex     = 0

  // Flame audio nodes
  private flameGain: GainNode | null = null
  private flameSource: AudioBufferSourceNode | null = null

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.55
      this.masterGain.connect(this.ctx.destination)
    }
    return this.ctx
  }

  // ── Music ─────────────────────────────────────────────────────────
  startAmbience() {
    const ctx        = this.getCtx()
    this.nextNoteTime = ctx.currentTime + 0.05
    this.stepIndex    = 0
    this.scheduleTimer = setInterval(() => this.scheduleTick(), 80)
  }

  stopAmbience() {
    if (this.scheduleTimer !== null) {
      clearInterval(this.scheduleTimer)
      this.scheduleTimer = null
    }
  }

  private scheduleTick() {
    if (!this.ctx) return
    const ctx = this.ctx

    while (this.nextNoteTime < ctx.currentTime + LOOK_AHEAD) {
      this.scheduleNote(this.stepIndex, this.nextNoteTime)
      this.nextNoteTime += STEP
      this.stepIndex = (this.stepIndex + 1) % LEAD.length
    }
  }

  private scheduleNote(step: number, when: number) {
    const ctx = this.ctx!

    // Lead — square wave
    const leadFreq = LEAD[step]
    if (leadFreq > 0) {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type           = 'square'
      osc.frequency.value = leadFreq
      gain.gain.setValueAtTime(0.18, when)
      gain.gain.exponentialRampToValueAtTime(0.001, when + STEP * 0.85)
      osc.connect(gain)
      gain.connect(this.masterGain)
      osc.start(when)
      osc.stop(when + STEP * 0.85)
    }

    // Bass — triangle wave
    const bassFreq = BASS[step]
    if (bassFreq > 0) {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type            = 'triangle'
      osc.frequency.value  = bassFreq
      gain.gain.setValueAtTime(0.28, when)
      gain.gain.exponentialRampToValueAtTime(0.001, when + STEP * 3.5)
      osc.connect(gain)
      gain.connect(this.masterGain)
      osc.start(when)
      osc.stop(when + STEP * 3.5)
    }

    // Hi-hat — every 2 steps
    if (step % 2 === 0) {
      const bufLen = Math.floor(ctx.sampleRate * 0.04)
      const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const data   = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1
      const src  = ctx.createBufferSource()
      const gain = ctx.createGain()
      const filt = ctx.createBiquadFilter()
      filt.type            = 'highpass'
      filt.frequency.value  = 8000
      src.buffer = buf
      gain.gain.setValueAtTime(0.06, when)
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.04)
      src.connect(filt)
      filt.connect(gain)
      gain.connect(this.masterGain)
      src.start(when)
    }

    // Kick — every 8 steps (on the beat)
    if (step % 8 === 0) {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(160, when)
      osc.frequency.exponentialRampToValueAtTime(40, when + 0.08)
      gain.gain.setValueAtTime(0.6, when)
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.12)
      osc.connect(gain)
      gain.connect(this.masterGain)
      osc.start(when)
      osc.stop(when + 0.12)
    }
  }

  // ── Spatial mosquito presence (subtle, not disturbing) ─────────────
  // Just a very soft volume swell when many mosquitoes are near — no oscillators
  update(_mosquitoes: MosquitoAI[], _playerPos: Vector3) {
    // Proximity feedback handled by the zap sound; no buzz needed
  }

  // ── Flame roar ────────────────────────────────────────────────────
  startFlameSound() {
    const ctx = this.getCtx()
    if (this.flameGain) return   // already playing

    // White noise buffer looped continuously
    const bufLen = ctx.sampleRate * 1.5
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data   = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1

    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop   = true

    // Low-pass shapes noise into a deep roar
    const lpf = ctx.createBiquadFilter()
    lpf.type            = 'lowpass'
    lpf.frequency.value = 320
    lpf.Q.value         = 1.2

    // Band-pass adds a mid-frequency "whoosh" crackle
    const bpf = ctx.createBiquadFilter()
    bpf.type            = 'bandpass'
    bpf.frequency.value = 800
    bpf.Q.value         = 0.8

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.38, ctx.currentTime + 0.12)

    src.connect(lpf)
    lpf.connect(bpf)
    bpf.connect(gain)
    gain.connect(this.masterGain)
    src.start()

    this.flameSource = src
    this.flameGain   = gain
  }

  stopFlameSound() {
    if (!this.flameGain || !this.ctx) return
    const ctx = this.ctx
    this.flameGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.10)
    const src = this.flameSource
    setTimeout(() => { src?.stop(); src?.disconnect() }, 150)
    this.flameGain   = null
    this.flameSource = null
  }

  // ── Zap SFX ───────────────────────────────────────────────────────
  playZap() {
    const ctx = this.getCtx()

    const osc  = ctx.createOscillator()
    osc.type   = 'sawtooth'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.09)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)

    const filter = ctx.createBiquadFilter()
    filter.type            = 'highpass'
    filter.frequency.value  = 800

    const dist = ctx.createWaveShaper()
    dist.curve = this.makeDistortionCurve(200)

    osc.connect(gain)
    gain.connect(filter)
    filter.connect(dist)
    dist.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 256
    const curve   = new Float32Array(samples) as Float32Array<ArrayBuffer>
    const deg     = Math.PI / 180
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
    }
    return curve
  }
}
