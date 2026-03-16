import { LeaderboardService, ScoreEntry } from '../services/LeaderboardService'

export class ResultsScreen {
  private el: HTMLDivElement

  constructor(
    root: HTMLDivElement,
    onPlayAgain: () => void,
    private leaderboard: LeaderboardService,
  ) {
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

  async show(playerName: string, score: number, kills: number, bestCombo: number) {
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
      <div style="display:flex;gap:16px;margin-top:4px;">
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

      <div id="leaderboardSection" style="
        margin-top:8px;
        width: 320px;
        text-align: center;
      ">
        ${this.leaderboard.isConfigured
          ? '<div style="color:#BCAAA4;font-size:0.9rem;">Loading leaderboard…</div>'
          : ''}
      </div>
    `

    this.el.style.display = 'flex'

    if (!this.leaderboard.isConfigured) return

    // Submit first, then fetch so the new score is included
    await this.leaderboard.submit(playerName, score, kills, bestCombo)
    const entries = await this.leaderboard.getTop(10)
    this.renderLeaderboard(entries, playerName, score)
  }

  private renderLeaderboard(entries: ScoreEntry[], playerName: string, playerScore: number) {
    const el = this.el.querySelector('#leaderboardSection')
    if (!el) return

    if (entries.length === 0) {
      el.innerHTML = '<div style="color:#BCAAA4;font-size:0.85rem;">No scores yet.</div>'
      return
    }

    const rows = entries.map((e, i) => {
      const isMe = e.name === playerName && e.score === playerScore
      return `
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding: 5px 10px;
          border-radius: 6px;
          background: ${isMe ? 'rgba(255,111,0,0.18)' : 'rgba(255,255,255,0.04)'};
          font-weight: ${isMe ? 'bold' : 'normal'};
          color: ${isMe ? '#FFD600' : '#FFCC80'};
          font-size: 0.92rem;
        ">
          <span style="min-width:1.4rem;color:#BCAAA4;">${i + 1}.</span>
          <span style="flex:1;text-align:left;padding:0 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.name}</span>
          <span style="color:#FFD600;font-weight:bold;">${e.score}</span>
          <span style="color:#BCAAA4;font-size:0.8rem;margin-left:8px;">${e.kills}🦟</span>
        </div>
      `
    }).join('')

    el.innerHTML = `
      <div style="color:#FFD600;font-size:1rem;font-weight:bold;margin-bottom:8px;letter-spacing:1px;">
        🏆 LEADERBOARD
      </div>
      <div style="
        display:flex;
        flex-direction:column;
        gap:3px;
        max-height:240px;
        overflow-y:auto;
      ">
        ${rows}
      </div>
    `
  }

  hide() {
    this.el.style.display = 'none'
  }
}
