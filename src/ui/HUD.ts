export class HUD {
  private el: HTMLDivElement
  private scoreEl!: HTMLSpanElement
  private killsEl!: HTMLSpanElement
  private timerEl!: HTMLSpanElement
  private comboEl!: HTMLDivElement

  // Health
  private hpBarFill!: HTMLDivElement
  private hpText!: HTMLSpanElement

  // Damage vignette (persistent red edges when low HP)
  private vignette: HTMLDivElement
  // Flash overlay (brief red pulse on each bite)
  private flashEl: HTMLDivElement

  constructor(root: HTMLDivElement) {
    // ── Vignette (always in DOM, shown during play) ──────────────
    this.vignette = document.createElement('div')
    this.vignette.style.cssText = `
      position: fixed; inset: 0;
      pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 55%, rgba(180,0,0,0) 100%);
      transition: background 0.3s;
      z-index: 5;
      display: none;
    `
    root.appendChild(this.vignette)

    // ── Damage flash ─────────────────────────────────────────────
    this.flashEl = document.createElement('div')
    this.flashEl.style.cssText = `
      position: fixed; inset: 0;
      pointer-events: none;
      background: rgba(220, 0, 0, 0);
      transition: background 0.08s;
      z-index: 6;
    `
    root.appendChild(this.flashEl)

    // ── Main HUD container ───────────────────────────────────────
    this.el = document.createElement('div')
    this.el.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0;
      display: none;
      padding: 12px 20px;
    `
    this.el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:1.4rem;font-weight:bold;text-shadow:0 2px 4px rgba(0,0,0,0.8)">
          Score: <span id="hud-score">0</span>
        </div>
        <div style="font-size:1.4rem;font-weight:bold;text-shadow:0 2px 4px rgba(0,0,0,0.8)">
          Kills: <span id="hud-kills">0</span>
        </div>
        <div id="hud-timer" style="font-size:1.8rem;font-weight:bold;text-shadow:0 2px 4px rgba(0,0,0,0.8);min-width:3rem;text-align:right">
          25
        </div>
      </div>

      <div id="hud-combo" style="
        text-align:center;
        margin-top:6px;
        font-size:1.6rem;
        font-weight:bold;
        color:#FFD600;
        text-shadow:0 0 12px #FF6F00;
        opacity:0;
        transition:opacity 0.2s;
      "></div>

      <!-- Health bar — fixed to bottom of screen -->
      <div style="
        position:fixed;
        bottom:22px; left:50%;
        transform:translateX(-50%);
        display:flex;
        align-items:center;
        gap:10px;
      ">
        <span style="font-size:1.1rem;font-weight:bold;text-shadow:0 2px 4px rgba(0,0,0,0.9);white-space:nowrap;">
          ❤ HP
        </span>
        <div style="
          width:200px; height:16px;
          background:rgba(0,0,0,0.55);
          border:2px solid rgba(255,255,255,0.25);
          border-radius:8px;
          overflow:hidden;
        ">
          <div id="hud-hp-fill" style="
            height:100%;
            width:100%;
            background: linear-gradient(90deg, #43A047, #66BB6A);
            border-radius:6px;
            transition: width 0.15s, background 0.3s;
          "></div>
        </div>
        <span id="hud-hp-text" style="
          font-size:1rem;
          font-weight:bold;
          min-width:2.8rem;
          text-shadow:0 2px 4px rgba(0,0,0,0.9);
        ">100</span>
      </div>
    `
    root.appendChild(this.el)

    this.scoreEl  = this.el.querySelector('#hud-score')!
    this.killsEl  = this.el.querySelector('#hud-kills')!
    this.timerEl  = this.el.querySelector('#hud-timer')!
    this.comboEl  = this.el.querySelector('#hud-combo')!
    this.hpBarFill = this.el.querySelector('#hud-hp-fill')!
    this.hpText    = this.el.querySelector('#hud-hp-text')!
  }

  update(score: number, kills: number, combo: number, timeLeft: number, hp: number, maxHp: number) {
    this.scoreEl.textContent = String(score)
    this.killsEl.textContent = String(kills)

    const secs = Math.ceil(timeLeft)
    this.timerEl.textContent = String(secs)
    this.timerEl.style.color = secs <= 10 ? '#EF5350' : 'white'

    if (combo >= 2) {
      this.comboEl.textContent = `x${combo} COMBO!`
      this.comboEl.style.opacity = '1'
    } else {
      this.comboEl.style.opacity = '0'
    }

    this.updateHealth(hp, maxHp)
  }

  private updateHealth(hp: number, maxHp: number) {
    const pct = Math.max(0, hp / maxHp)
    this.hpBarFill.style.width = `${pct * 100}%`
    this.hpText.textContent = String(Math.ceil(hp))

    // Bar colour: green → yellow → red
    if (pct > 0.6) {
      this.hpBarFill.style.background = 'linear-gradient(90deg,#2E7D32,#66BB6A)'
    } else if (pct > 0.3) {
      this.hpBarFill.style.background = 'linear-gradient(90deg,#F57F17,#FFD54F)'
    } else {
      this.hpBarFill.style.background = 'linear-gradient(90deg,#B71C1C,#EF5350)'
    }

    // Vignette intensifies as HP drops below 40%
    const vigOpacity = pct < 0.4 ? (0.4 - pct) / 0.4 : 0   // 0 → 1
    this.vignette.style.background =
      `radial-gradient(ellipse at center, transparent 40%, rgba(180,0,0,${vigOpacity.toFixed(2)}) 100%)`
  }

  // Brief red flash on each bite — call from HealthManager.onDamage
  flashDamage() {
    this.flashEl.style.background = 'rgba(220,0,0,0.22)'
    setTimeout(() => {
      this.flashEl.style.background = 'rgba(220,0,0,0)'
    }, 80)
  }

  // Green flash on pickup collected
  flashHeal() {
    this.flashEl.style.background = 'rgba(0,200,60,0.18)'
    setTimeout(() => {
      this.flashEl.style.background = 'rgba(0,200,60,0)'
    }, 120)
  }

  show() {
    this.el.style.display      = 'block'
    this.vignette.style.display = 'block'
  }

  hide() {
    this.el.style.display       = 'none'
    this.vignette.style.display = 'none'
  }
}
