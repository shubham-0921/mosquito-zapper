import { PlayerController } from '../player/PlayerController'

const JOYSTICK_MAX   = 42    // max knob travel in px
const LOOK_SENS      = 0.0038 // rad per pixel
const LEFT_ZONE      = 0.42  // left 42% of screen = joystick

export class TouchControls {
  private container:  HTMLDivElement
  private joyBase:    HTMLDivElement
  private joyKnob:    HTMLDivElement
  private swingBtn:   HTMLDivElement

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

    this.joyBase.appendChild(this.joyKnob)
    this.container.appendChild(this.joyBase)
    this.container.appendChild(this.swingBtn)

    this.attachEvents()
  }

  // ── DOM builders ─────────────────────────────────────────────────
  private makeJoyBase(): HTMLDivElement {
    const el = document.createElement('div')
    el.style.cssText = `
      position: absolute;
      bottom: 28px; left: 28px;
      width: 108px; height: 108px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
      border: 2px solid rgba(255,255,255,0.18);
      pointer-events: none;
    `
    return el
  }

  private makeJoyKnob(): HTMLDivElement {
    const el = document.createElement('div')
    el.style.cssText = `
      position: absolute;
      top: 50%; left: 50%;
      width: 42px; height: 42px;
      border-radius: 50%;
      background: rgba(255,255,255,0.32);
      border: 2px solid rgba(255,255,255,0.55);
      transform: translate(-50%, -50%);
      pointer-events: none;
      transition: background 0.1s;
    `
    return el
  }

  private makeSwingBtn(): HTMLDivElement {
    const el = document.createElement('div')
    el.style.cssText = `
      position: absolute;
      bottom: 28px; right: 28px;
      width: 88px; height: 88px;
      border-radius: 50%;
      background: rgba(255,130,0,0.32);
      border: 2.5px solid rgba(255,200,0,0.65);
      display: flex; align-items: center; justify-content: center;
      font-size: 2.2rem;
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition: background 0.08s, transform 0.08s;
    `
    el.textContent = '⚡'
    return el
  }

  // ── Event wiring ─────────────────────────────────────────────────
  private attachEvents() {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement

    // Swing button — separate touch handling, doesn't bleed into look
    this.swingBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.player.triggerSwing()
      this.swingBtn.style.background = 'rgba(255,210,0,0.55)'
      this.swingBtn.style.transform  = 'scale(0.92)'
    }, { passive: false })

    this.swingBtn.addEventListener('touchend', () => {
      this.swingBtn.style.background = 'rgba(255,130,0,0.32)'
      this.swingBtn.style.transform  = 'scale(1)'
    })

    // Canvas handles joystick + look
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      for (const t of Array.from(e.changedTouches)) {
        const onLeft = t.clientX < window.innerWidth * LEFT_ZONE

        if (onLeft && this.joyId === null) {
          this.joyId     = t.identifier
          this.joyOrigin = { x: t.clientX, y: t.clientY }
          // Float the joystick base to wherever the thumb lands
          this.joyBase.style.left   = `${t.clientX - 54}px`
          this.joyBase.style.bottom = ''
          this.joyBase.style.top    = `${t.clientY - 54}px`
        } else if (!onLeft && this.lookId === null) {
          this.lookId      = t.identifier
          this.lastLookPos = { x: t.clientX, y: t.clientY }
        }
      }
    }, { passive: false })

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joyId)  this.updateJoy(t.clientX, t.clientY)
        if (t.identifier === this.lookId) this.updateLook(t.clientX, t.clientY)
      }
    }, { passive: false })

    const endTouch = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joyId) {
          this.joyId     = null
          this.moveVec   = { x: 0, z: 0 }
          this.resetKnob()
        }
        if (t.identifier === this.lookId) this.lookId = null
      }
    }

    canvas.addEventListener('touchend',    endTouch, { passive: false })
    canvas.addEventListener('touchcancel', endTouch, { passive: false })
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
    // Snap base back to default bottom-left position
    this.joyBase.style.top    = ''
    this.joyBase.style.bottom = '28px'
    this.joyBase.style.left   = '28px'
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

  show() {
    this.container.style.display         = 'block'
    this.container.style.pointerEvents   = 'auto'
  }

  hide() {
    this.container.style.display = 'none'
    this.moveVec = { x: 0, z: 0 }
    this.resetKnob()
  }
}
