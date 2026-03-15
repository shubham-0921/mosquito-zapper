export class ResultsScreen {
  private el: HTMLDivElement

  constructor(root: HTMLDivElement, onPlayAgain: () => void) {
    this.el = document.createElement('div')
    this.el.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10, 5, 2, 0.94);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      z-index: 10;
    `
    root.appendChild(this.el)

    this.el.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.id === 'playAgainBtn') {
        this.hide()
        onPlayAgain()
      }
      if (target.id === 'shareBtn') {
        const kills = parseInt(target.dataset['kills'] ?? '0', 10)
        const score = parseInt(target.dataset['score'] ?? '0', 10)
        const text = encodeURIComponent(`I zapped ${kills} mosquitoes! Score: ${score} 🦟⚡ Play Mosquito Zapper!`)
        window.open(`https://wa.me/?text=${text}`, '_blank')
      }
    })
  }

  show(score: number, kills: number, bestCombo: number) {
    const stored = parseInt(localStorage.getItem('mz_highscore') ?? '0', 10)
    const isNewBest = score > stored

    this.el.innerHTML = `
      <div style="font-size:2.5rem;font-weight:900;color:#FFD600;text-shadow:0 0 20px #FF6F00;">
        Round Over!
      </div>
      ${isNewBest ? '<div style="color:#A5D6A7;font-size:1.1rem;font-weight:bold;">🏆 New Personal Best!</div>' : ''}
      <div style="text-align:center;line-height:2.2;font-size:1.2rem;">
        <div>Score: <strong style="color:#FFD600">${score}</strong></div>
        <div>Mosquitoes Zapped: <strong style="color:#EF5350">${kills}</strong></div>
        <div>Best Combo: <strong style="color:#80DEEA">x${bestCombo}</strong></div>
        ${stored > 0 ? `<div style="color:#BCAAA4;font-size:0.9rem;margin-top:4px;">Personal Best: ${Math.max(stored, score)}</div>` : ''}
      </div>
      <div style="display:flex;gap:16px;margin-top:12px;">
        <button id="shareBtn" data-kills="${kills}" data-score="${score}" style="
          padding: 12px 28px;
          font-size: 1rem;
          font-weight: bold;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        ">Share on WhatsApp</button>
        <button id="playAgainBtn" style="
          padding: 12px 28px;
          font-size: 1rem;
          font-weight: bold;
          background: #FF6F00;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        ">Play Again</button>
      </div>
    `
    this.el.style.display = 'flex'
  }

  hide() {
    this.el.style.display = 'none'
  }
}
