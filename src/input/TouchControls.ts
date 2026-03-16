import { PlayerController } from '../player/PlayerController'

const JOYSTICK_MAX   = 50     // max knob travel in px
const LOOK_SENS      = 0.0045 // rad per pixel — slightly snappier than before
const LEFT_ZONE      = 0.42   // left 42% of screen = joystick

export class TouchControls {
  private container:  HTMLDivElement
  private joyBase:    HTMLDivElement
  private joyKnob:    HTMLDivElement
  private swingBtn:   HTMLDivElement
  private flameBtn:    HTMLDivElement
  private flameActive  = false

  private joyId:   number | null = null
  private lookId:  number | null = null

  private joyOrigin    = { x: 0, y: 0 }
  private moveVec      = { x: 0, z: 0 }
  private lastLookPos  = { x: 0, y: 0 }

  constructor(private player: PlayerController) {
    this.container = document.createElement('div')
    this.container.style.cssText = `
      position: fixed; inset: 0;
      z-index: 20;
      display: none;
      pointer-events: none;
    `
    document.body.appendChild(this.container)

    this.joyBase  = this.makeJoyBase()
    this.joyKnob  = this.makeJoyKnob()
    this.swingBtn = this.makeSwingBtn()
    this.flameBtn = this.makeFlameBtn()

    this.joyBase.appendChild(this.joyKnob)
    this.container.appendChild(this.joyBase)
    this.container.appendChild(this.swingBtn)
    this.container.appendChild(this.flameBtn)

    this.attachEvents()
  }

  // ── DOM builders ─────────────────────────────────────────────────
  private makeJoyBase(): HTMLDivElement {
    const el = document.createElement('div')
    el.style.cssText = `
      position: absolute;
      bottom: 32px; left: 32px;
      width: 124px; height: 124px;
      border-radius: 50%;
      background: rgba(255,255,255,0.07);
      border: 2px solid rgba(255,255,255,0.22);
      pointer-events: none;
    `
    return el
  }

  private makeJoyKnob(): HTMLDivElement {
    const el = document.createElement('div')
    el.style.cssText = `
      position: absolute;
      top: 50%; left: 50%;
      width: 52px; height: 52px;
      border-radius: 50%;
      background: rgba(255,255,255,0.35);
      border: 2px solid rgba(255,255,255,0.60);
      transform: translate(-50%, -50%);
      pointer-events: none;
      transition: background 0.1s;
      box-shadow: 0 0 12px rgba(255,255,255,0.15);
    `
    return el
  }

  private makeSwingBtn(): HTMLDivElement {
    const el = document.createElement('div')
    el.style.cssText = `
      position: absolute;
      bottom: 32px; right: 32px;
      width: 96px; height: 96px;
      border-radius: 50%;
      background: rgba(255,130,0,0.30);
      border: 2.5px solid rgba(255,200,0,0.65);
      display: flex; align-items: center; justify-content: center;
      flex-direction: column;
      font-size: 2.2rem;
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition: background 0.08s, transform 0.08s;
      box-shadow: 0 0 16px rgba(255,160,0,0.25);
    `
    el.innerHTML = `<span style="font-size:2rem">⚡</span><span style="font-size:0.55rem;font-family:monospace;letter-spacing:0.05em;color:rgba(255,220,100,0.85);margin-top:2px">ZAP</span>`
    return el
  }

  private makeFlameBtn(): HTMLDivElement {
    const el = document.createElement('div')
    el.style.cssText = `
      position: absolute;
      bottom: 172px; left: 32px;
      width: 88px; height: 88px;
      border-radius: 50%;
      background: rgba(220,60,0,0.30);
      border: 2.5px solid rgba(255,120,0,0.65);
      display: none;
      align-items: center; justify-content: center;
      flex-direction: column;
      font-size: 2rem;
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
      box-shadow: 0 0 18px rgba(255,80,0,0.30);
    `
    el.innerHTML = `<span style="font-size:1.8rem">🔥</span><span style="font-size:0.5rem;font-family:monospace;letter-spacing:0.05em;color:rgba(255,180,80,0.85);margin-top:2px">TAP</span>`
    return el
  }

  // ── Event wiring ─────────────────────────────────────────────────
  private attachEvents() {
    // Swing button
    this.swingBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.player.triggerSwing()
      this.swingBtn.style.background = 'rgba(255,210,0,0.55)'
      this.swingBtn.style.transform  = 'scale(0.90)'
    }, { passive: false })

    this.swingBtn.addEventListener('touchend', () => {
      this.swingBtn.style.background = 'rgba(255,130,0,0.30)'
      this.swingBtn.style.transform  = 'scale(1)'
    })

    // Flame button — tap to toggle on/off (left thumb, no need to hold)
    this.flameBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.flameActive = !this.flameActive
      if (this.flameActive) {
        this.player.startFlame()
        this.flameBtn.style.background = 'rgba(255,100,0,0.65)'
        this.flameBtn.style.boxShadow  = '0 0 32px rgba(255,100,0,0.75)'
        this.flameBtn.style.transform  = 'scale(1.08)'
        this.flameBtn.querySelector('span:last-child')!.textContent = 'ON'
      } else {
        this.player.stopFlame()
        this.flameBtn.style.background = 'rgba(220,60,0,0.30)'
        this.flameBtn.style.boxShadow  = '0 0 18px rgba(255,80,0,0.30)'
        this.flameBtn.style.transform  = 'scale(1)'
        this.flameBtn.querySelector('span:last-child')!.textContent = 'TAP'
      }
    }, { passive: false })

    // Full-screen handler for joystick + look
    this.container.addEventListener('touchstart', (e) => {
      e.preventDefault()
      for (const t of Array.from(e.changedTouches)) {
        const onLeft = t.clientX < window.innerWidth * LEFT_ZONE

        if (onLeft && this.joyId === null) {
          this.joyId     = t.identifier
          this.joyOrigin = { x: t.clientX, y: t.clientY }
          // Float joystick base to wherever the thumb lands
          this.joyBase.style.left   = `${t.clientX - 62}px`
          this.joyBase.style.bottom = ''
          this.joyBase.style.top    = `${t.clientY - 62}px`
        } else if (!onLeft && this.lookId === null) {
          this.lookId      = t.identifier
          this.lastLookPos = { x: t.clientX, y: t.clientY }
        }
      }
    }, { passive: false })

    this.container.addEventListener('touchmove', (e) => {
      e.preventDefault()
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joyId)  this.updateJoy(t.clientX, t.clientY)
        if (t.identifier === this.lookId) this.updateLook(t.clientX, t.clientY)
      }
    }, { passive: false })

    const endTouch = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joyId) {
          this.joyId   = null
          this.moveVec = { x: 0, z: 0 }
          this.resetKnob()
        }
        if (t.identifier === this.lookId) this.lookId = null
      }
    }

    this.container.addEventListener('touchend',    endTouch, { passive: false })
    this.container.addEventListener('touchcancel', endTouch, { passive: false })
  }

  // ── Joystick ─────────────────────────────────────────────────────
  private updateJoy(cx: number, cy: number) {
    let dx = cx - this.joyOrigin.x
    let dy = cy - this.joyOrigin.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > JOYSTICK_MAX) {
      dx = (dx / d) * JOYSTICK_MAX
      dy = (dy / d) * JOYSTICK_MAX
    }
    this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
    this.moveVec = { x: dx / JOYSTICK_MAX, z: -(dy / JOYSTICK_MAX) }
  }

  private resetKnob() {
    this.joyKnob.style.transform = 'translate(-50%, -50%)'
    this.joyBase.style.top    = ''
    this.joyBase.style.bottom = '32px'
    this.joyBase.style.left   = '32px'
  }

  // ── Look ─────────────────────────────────────────────────────────
  private updateLook(cx: number, cy: number) {
    const dx = cx - this.lastLookPos.x
    const dy = cy - this.lastLookPos.y
    this.player.applyLookDelta(dx * LOOK_SENS, dy * LOOK_SENS)
    this.lastLookPos = { x: cx, y: cy }
  }

  // ── Per-frame (called by Game loop) ──────────────────────────────
  update(dt: number) {
    if (this.moveVec.x !== 0 || this.moveVec.z !== 0) {
      this.player.applyMoveInput(this.moveVec.x, this.moveVec.z, dt)
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────
  show() {
    this.container.style.display       = 'block'
    this.container.style.pointerEvents = 'auto'
  }

  hide() {
    this.container.style.display = 'none'
    this.moveVec = { x: 0, z: 0 }
    this.resetKnob()
    if (this.flameActive) {
      this.flameActive = false
      this.player.stopFlame()
    }
  }

  /** Call this when flamethrower is unlocked mid-game */
  showFlameBtn() {
    this.flameActive = false
    this.flameBtn.style.display    = 'flex'
    this.flameBtn.style.background = 'rgba(220,60,0,0.30)'
    this.flameBtn.style.boxShadow  = '0 0 18px rgba(255,80,0,0.30)'
    this.flameBtn.querySelector('span:last-child')!.textContent = 'TAP'
    // Pulse to draw attention
    this.flameBtn.style.transform = 'scale(1.28)'
    setTimeout(() => { this.flameBtn.style.transform = 'scale(1)' }, 320)
  }
}
