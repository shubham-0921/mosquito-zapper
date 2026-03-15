export class TitleScreen {
  private el: HTMLDivElement

  constructor(root: HTMLDivElement, onStart: () => void) {
    this.el = document.createElement('div')
    this.el.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10, 5, 2, 0.92);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 24px;
      z-index: 10;
    `

    const stored = localStorage.getItem('mz_highscore')
    const highScore = stored ? parseInt(stored, 10) : 0

    this.el.innerHTML = `
      <div style="font-size:3.5rem;font-weight:900;color:#FFD600;text-shadow:0 0 30px #FF6F00,0 4px 8px rgba(0,0,0,0.8);letter-spacing:2px;">
        🦟 MOSQUITO ZAPPER
      </div>
      <div style="font-size:1.3rem;color:#FFCC80;font-style:italic;text-shadow:0 2px 4px rgba(0,0,0,0.8);">
        It's 2 AM. They're back.
      </div>
      ${highScore > 0 ? `<div style="color:#80CBC4;font-size:1rem;">Best: ${highScore}</div>` : ''}
      <div style="margin-top:16px;font-size:0.9rem;color:#BCAAA4;max-width:380px;text-align:center;line-height:1.6;">
        WASD — Move &nbsp;|&nbsp; Mouse — Look<br>
        Left Click — ZZZAP
      </div>
      <button id="startBtn" style="
        margin-top:8px;
        padding: 16px 48px;
        font-size: 1.4rem;
        font-weight: bold;
        background: #FF6F00;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 2px;
        box-shadow: 0 4px 20px rgba(255,111,0,0.6);
        transition: transform 0.1s, box-shadow 0.1s;
      ">Start Hunt</button>
    `

    root.appendChild(this.el)

    const btn = this.el.querySelector('#startBtn') as HTMLButtonElement
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)'
      btn.style.boxShadow = '0 6px 28px rgba(255,111,0,0.8)'
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)'
      btn.style.boxShadow = '0 4px 20px rgba(255,111,0,0.6)'
    })
    btn.addEventListener('click', () => {
      this.hide()
      onStart()
    })
  }

  show() {
    this.el.style.display = 'flex'
  }

  hide() {
    this.el.style.display = 'none'
  }
}
