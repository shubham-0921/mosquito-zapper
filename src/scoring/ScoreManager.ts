export class ScoreManager {
  private _score = 0
  private _kills = 0
  private _combo = 0
  private _bestCombo = 0
  private lastKillTime = 0
  private readonly COMBO_WINDOW_MS = 2000

  reset() {
    this._score = 0
    this._kills = 0
    this._combo = 0
    this._bestCombo = 0
    this.lastKillTime = 0
  }

  registerKill() {
    const now = Date.now()
    if (now - this.lastKillTime < this.COMBO_WINDOW_MS) {
      this._combo++
    } else {
      this._combo = 1
    }
    this.lastKillTime = now

    if (this._combo > this._bestCombo) {
      this._bestCombo = this._combo
    }

    const base = 10
    const bonus = this._combo >= 5 ? 100 : this._combo >= 3 ? 50 : this._combo >= 2 ? 25 : 0
    this._score += base * this._combo + bonus
    this._kills++
  }

  getStats() {
    return {
      score: this._score,
      kills: this._kills,
      combo: this._combo,
      bestCombo: this._bestCombo,
    }
  }
}
