import { LeaderboardService } from '../services/LeaderboardService'

function injectStyles() {
  if (document.getElementById('title-styles')) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'
  document.head.appendChild(link)

  const style = document.createElement('style')
  style.id = 'title-styles'
  style.textContent = `
    @keyframes title-bob {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-6px); }
    }
    @keyframes blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
    @keyframes btn-breathe {
      0%, 100% { box-shadow: 0 4px 14px rgba(230,81,0,0.35), 0 1px 3px rgba(0,0,0,0.15); }
      50%       { box-shadow: 0 6px 28px rgba(230,81,0,0.60), 0 1px 3px rgba(0,0,0,0.15); }
    }
    @keyframes gold-shine {
      0%, 100% { color: #B8860B; }
      50%       { color: #DAA520; }
    }
    @keyframes row-fade-in {
      from { opacity: 0; transform: translateX(-8px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .ts-input {
      background: #ffffff;
      border: 2px solid #FFCC80;
      color: #1a1a1a;
      font-family: 'Press Start 2P', monospace;
      font-size: 0.78rem;
      padding: 12px 14px;
      outline: none;
      width: 100%;
      box-sizing: border-box;
      letter-spacing: 1px;
      border-radius: 4px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .ts-input:focus {
      border-color: #E65100;
      box-shadow: 0 0 0 3px rgba(230,81,0,0.15);
    }
    .ts-input::placeholder { color: #BDBDBD; }
    .ts-range {
      accent-color: #E65100;
      cursor: pointer;
      flex: 1;
    }
    .ts-card {
      width: min(680px, 94vw);
      background: #ffffff;
      box-sizing: border-box;
    }
    .ts-row {
      display: grid;
      grid-template-columns: 48px 1fr 110px 64px;
      padding: 11px 16px;
      align-items: center;
      border-bottom: 1px solid #FFF3E0;
      animation: row-fade-in 0.25s ease both;
    }
    .ts-row:last-child { border-bottom: none; }
  `
  document.head.appendChild(style)
}

const RANK_COLORS = ['#B8860B', '#607D8B', '#795548']
const RANK_LABELS = ['👑', '②', '③']

export class TitleScreen {
  private el: HTMLDivElement
  private scoresEl!: HTMLDivElement

  constructor(
    root: HTMLDivElement,
    onStart: (name: string) => void,
    private leaderboard: LeaderboardService,
  ) {
    injectStyles()

    this.el = document.createElement('div')
    this.el.style.cssText = `
      position: absolute; inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow-y: auto;
      z-index: 10;
      font-family: 'Press Start 2P', monospace;
      background:
        radial-gradient(ellipse 100% 50% at 50% 0%, rgba(255,167,38,0.12) 0%, transparent 65%),
        #FFF8EE;
      padding: 0 0 56px;
    `
    root.appendChild(this.el)

    const storedSens = localStorage.getItem('mz_sensitivity') ?? '3'
    const storedName = localStorage.getItem('mz_player_name') ?? ''

    this.el.innerHTML = `

      <!-- ══ TITLE ══ -->
      <div style="
        margin-top: 48px;
        text-align: center;
        animation: title-bob 3s ease-in-out infinite;
      ">
        <div style="
          font-size: clamp(1.5rem, 5vw, 2.8rem);
          color: #1A1A1A;
          letter-spacing: 3px;
          line-height: 1.6;
          text-shadow: 3px 3px 0 rgba(230,81,0,0.2);
        ">🦟 MOSQUITO<br>ZAPPER 🦟</div>

        <div style="
          margin-top: 14px;
          font-size: clamp(0.5rem, 1.4vw, 0.7rem);
          color: #E65100;
          letter-spacing: 4px;
          animation: blink 1.1s step-end infinite;
        ">— PRESS START —</div>
      </div>

      <!-- ══ LEADERBOARD CARD ══ -->
      <div class="ts-card" style="
        margin-top: 40px;
        border-radius: 8px 8px 0 0;
        overflow: hidden;
        box-shadow: 0 4px 24px rgba(0,0,0,0.10);
        border: 2px solid #FFE0B2;
        border-bottom: none;
      ">
        <!-- Orange header bar -->
        <div style="
          background: linear-gradient(135deg, #E65100 0%, #FF8F00 100%);
          padding: 14px 20px;
          text-align: center;
        ">
          <span style="
            font-size: clamp(0.6rem, 1.8vw, 0.85rem);
            color: #fff;
            letter-spacing: 4px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          ">★ HIGH SCORES ★</span>
        </div>

        <!-- Column headers -->
        <div style="
          display: grid;
          grid-template-columns: 48px 1fr 110px 64px;
          padding: 10px 16px;
          background: #FFF3E0;
          border-bottom: 2px solid #FFE0B2;
          font-size: 0.52rem;
          color: #9E6B00;
          letter-spacing: 2px;
        ">
          <span>RNK</span>
          <span>NAME</span>
          <span style="text-align:right;">SCORE</span>
          <span style="text-align:right;">KILLS</span>
        </div>

        <!-- Score rows -->
        <div id="scores-list" style="
          min-height: 200px;
          max-height: 420px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        ">
          <div style="
            text-align: center;
            color: #BDBDBD;
            font-size: 0.58rem;
            margin: auto;
            padding: 60px 0;
            animation: blink 1s step-end infinite;
          ">LOADING...</div>
        </div>
      </div>

      <!-- ══ SETTINGS CARD ══ -->
      <div class="ts-card" style="
        border-radius: 0 0 8px 8px;
        border: 2px solid #FFE0B2;
        border-top: none;
        padding: 22px 24px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.10);
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px 28px;
      ">

        <!-- Name (full width) -->
        <div style="grid-column: 1 / -1;">
          <div style="font-size:0.55rem;color:#9E6B00;letter-spacing:2px;margin-bottom:8px;">
            PLAYER NAME
          </div>
          <input id="nameInput" class="ts-input" type="text"
            maxlength="16" placeholder="ENTER YOUR NAME" value="${storedName}">
          <div id="nameError" style="
            display:none; color:#D32F2F; font-size:0.5rem;
            margin-top:8px; animation:blink 0.5s step-end infinite;
          ">▶ NAME REQUIRED ◀</div>
        </div>

        <!-- Sensitivity -->
        <div>
          <div style="font-size:0.55rem;color:#9E6B00;letter-spacing:2px;margin-bottom:10px;">
            MOUSE SENS
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <input id="sensSlider" class="ts-range" type="range" min="1" max="10" value="${storedSens}">
            <span id="sensVal" style="
              font-size:0.8rem; color:#E65100; min-width:22px; text-align:center;
            ">${storedSens}</span>
          </div>
        </div>

        <!-- Controls -->
        <div style="
          display:flex; align-items:center; justify-content:flex-end;
          font-size: clamp(0.36rem, 1vw, 0.48rem);
          color: #BDBDBD;
          line-height: 2.2;
          text-align: right;
          letter-spacing: 1px;
        ">
          WASD : MOVE<br>
          MOUSE : AIM<br>
          CLICK : ZAP
        </div>

      </div>

      <!-- ══ START BUTTON ══ -->
      <button id="startBtn" style="
        margin-top: 28px;
        padding: 20px 68px;
        font-family: 'Press Start 2P', monospace;
        font-size: clamp(0.75rem, 2.2vw, 1rem);
        background: linear-gradient(135deg, #E65100 0%, #FF8F00 100%);
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        letter-spacing: 4px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.25);
        animation: btn-breathe 2s ease-in-out infinite;
        transition: transform 0.08s, filter 0.08s;
      ">▶ START HUNT</button>

    `

    this.scoresEl = this.el.querySelector('#scores-list') as HTMLDivElement

    const slider    = this.el.querySelector('#sensSlider')  as HTMLInputElement
    const sensVal   = this.el.querySelector('#sensVal')     as HTMLSpanElement
    const nameInput = this.el.querySelector('#nameInput')   as HTMLInputElement
    const nameError = this.el.querySelector('#nameError')   as HTMLDivElement
    const btn       = this.el.querySelector('#startBtn')    as HTMLButtonElement

    slider.addEventListener('input', () => {
      sensVal.textContent = slider.value
      localStorage.setItem('mz_sensitivity', slider.value)
    })

    nameInput.addEventListener('input', () => {
      if (nameInput.value.trim()) {
        nameError.style.display = 'none'
        nameInput.style.borderColor = '#FFCC80'
      }
    })

    btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.1)'; btn.style.transform = 'scale(1.04)' })
    btn.addEventListener('mouseleave', () => { btn.style.filter = 'brightness(1)';   btn.style.transform = 'scale(1)' })

    this.fetchAndRenderScores()

    btn.addEventListener('click', () => {
      const name = nameInput.value.trim()
      if (!name) {
        nameError.style.display = 'block'
        nameInput.style.borderColor = '#D32F2F'
        nameInput.focus()
        return
      }
      localStorage.setItem('mz_player_name', name)
      this.hide()
      onStart(name)
    })
  }

  show() {
    this.el.style.display = 'flex'
    this.el.scrollTop = 0
    this.fetchAndRenderScores()
  }

  hide() {
    this.el.style.display = 'none'
  }

  private async fetchAndRenderScores() {
    this.scoresEl.innerHTML = `
      <div style="text-align:center;color:#BDBDBD;font-size:0.58rem;padding:60px 0;
        animation:blink 1s step-end infinite;">LOADING...</div>
    `

    if (!this.leaderboard.isConfigured) {
      this.scoresEl.innerHTML = `
        <div style="text-align:center;color:#BDBDBD;font-size:0.58rem;padding:60px 0;">
          — NO SCORES YET —
        </div>
      `
      return
    }

    const entries = await this.leaderboard.getTop(10)

    if (entries.length === 0) {
      this.scoresEl.innerHTML = `
        <div style="text-align:center;color:#BDBDBD;font-size:0.58rem;padding:60px 0;">
          — BE THE FIRST TO PLAY —
        </div>
      `
      return
    }

    this.scoresEl.innerHTML = entries.map((e, i) => {
      const color    = RANK_COLORS[i] ?? '#424242'
      const rank     = i < 3 ? RANK_LABELS[i] : `${i + 1}`
      const isTop    = i < 3
      const rowBg    = i === 0 ? '#FFFDE7' : i % 2 === 0 ? '#FAFAFA' : '#ffffff'
      const delay    = `animation-delay: ${i * 0.05}s;`

      return `
        <div class="ts-row" style="
          background: ${rowBg};
          font-size: ${isTop ? '0.7rem' : '0.62rem'};
          color: ${color};
          ${i === 0 ? 'animation: gold-shine 2.5s ease-in-out infinite, row-fade-in 0.25s ease both;' : delay}
        ">
          <span style="font-size:${isTop ? '0.85rem' : '0.62rem'}">${rank}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:10px;">
            ${e.name.toUpperCase()}
          </span>
          <span style="text-align:right;color:#E65100;font-weight:bold;">
            ${e.score.toLocaleString()}
          </span>
          <span style="text-align:right;color:#BDBDBD;font-size:0.55rem;">${e.kills}🦟</span>
        </div>
      `
    }).join('')
  }
}
