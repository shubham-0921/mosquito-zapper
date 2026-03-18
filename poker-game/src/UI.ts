import { HandEvaluator } from './HandEvaluator';
import { TipsEngine } from './Tips';
import { HandRank, GamePhase } from './types';
import type { GameEvent } from './types';
import type { Player, PokerGame } from './PokerGame';
import type { Card } from './Card';

export class UI {
  private game: PokerGame;
  private tips = new TipsEngine();
  private strengthInterval: number | null = null;
  private logEntries: string[] = [];

  // DOM refs
  private $pot!: HTMLElement;
  private $phase!: HTMLElement;
  private $community!: HTMLElement;
  private $humanCards!: HTMLElement;
  private $humanChips!: HTMLElement;
  private $humanPosition!: HTMLElement;
  private $handName!: HTMLElement;
  private $handDesc!: HTMLElement;
  private $actions!: HTMLElement;
  private $gameControls!: HTMLElement;
  private $btnStart!: HTMLButtonElement;
  private $btnFold!: HTMLButtonElement;
  private $btnCheck!: HTMLButtonElement;
  private $btnCall!: HTMLButtonElement;
  private $callAmount!: HTMLElement;
  private $btnRaise!: HTMLButtonElement;
  private $raiseSlider!: HTMLInputElement;
  private $raiseAmount!: HTMLElement;
  private $strengthFill!: HTMLElement;
  private $strengthPct!: HTMLElement;
  private $tipHeadline!: HTMLElement;
  private $tipBody!: HTMLElement;
  private $logEntries!: HTMLElement;
  private $modal!: HTMLElement;
  private $modalBody!: HTMLElement;

  constructor(game: PokerGame) {
    this.game = game;
  }

  init(): void {
    this.$pot = this.q('#pot');
    this.$phase = this.q('#phase');
    this.$community = this.q('#community-cards');
    this.$humanCards = this.q('#human-cards');
    this.$humanChips = this.q('#human-chips');
    this.$humanPosition = this.q('#human-position');
    this.$handName = this.q('#hand-name');
    this.$handDesc = this.q('#hand-desc');
    this.$actions = this.q('#actions');
    this.$gameControls = this.q('#game-controls');
    this.$btnStart = this.q<HTMLButtonElement>('#btn-start');
    this.$btnFold = this.q<HTMLButtonElement>('#btn-fold');
    this.$btnCheck = this.q<HTMLButtonElement>('#btn-check');
    this.$btnCall = this.q<HTMLButtonElement>('#btn-call');
    this.$callAmount = this.q('#call-amount');
    this.$btnRaise = this.q<HTMLButtonElement>('#btn-raise');
    this.$raiseSlider = this.q<HTMLInputElement>('#raise-slider');
    this.$raiseAmount = this.q('#raise-amount');
    this.$strengthFill = this.q('#strength-fill');
    this.$strengthPct = this.q('#strength-pct');
    this.$tipHeadline = this.q('#tip-headline');
    this.$tipBody = this.q('#tip-body');
    this.$logEntries = this.q('#log-entries');
    this.$modal = this.q('#rankings-modal');
    this.$modalBody = this.q('#rankings-body');

    this.$btnStart.addEventListener('click', () => this.game.startHand());
    this.$btnFold.addEventListener('click', () => this.game.humanAction('fold'));
    this.$btnCheck.addEventListener('click', () => {
      const actions = this.game.getAvailableActions();
      this.game.humanAction(actions.includes('check') ? 'check' : 'call');
    });
    this.$btnCall.addEventListener('click', () => this.game.humanAction('call'));
    this.$btnRaise.addEventListener('click', () => {
      const amount = parseInt(this.$raiseSlider.value);
      this.game.humanAction('raise', amount);
    });
    this.$raiseSlider.addEventListener('input', () => {
      this.$raiseAmount.textContent = this.$raiseSlider.value;
    });

    this.q('#btn-rankings').addEventListener('click', () => this.showRankingsModal());
    this.q('#close-modal').addEventListener('click', () => this.$modal.classList.add('hidden'));
    this.$modal.addEventListener('click', (e) => { if (e.target === this.$modal) this.$modal.classList.add('hidden'); });

    this.game.on((event) => this.handleEvent(event));
    this.renderAISeats();
    this.renderWaiting();
    this.buildRankingsModal();
  }

  private handleEvent(event: GameEvent): void {
    this.addLog(event.message);

    switch (event.type) {
      case 'deal':
        this.renderTable();
        this.showTip(this.tips.getTipForPhase(GamePhase.PreFlop));
        break;

      case 'community':
        this.renderCommunity();
        this.renderAISeats();
        this.updateHandDisplay();
        if (event.phase) this.showTip(this.tips.getTipForPhase(event.phase));
        break;

      case 'phase':
        this.$phase.textContent = this.phaseLabel(event.phase ?? this.game.phase);
        this.updateActionButtons();
        this.renderAISeats();
        break;

      case 'fold':
      case 'check':
      case 'call':
      case 'raise':
      case 'allin':
        this.updateChipDisplays();
        this.$pot.textContent = String(this.game.pot);
        this.updateActionButtons();
        this.renderAISeats();
        break;

      case 'showdown':
        this.renderShowdown();
        break;

      case 'win':
        this.updateChipDisplays();
        this.$pot.textContent = '0';
        this.$gameControls.classList.remove('hidden');
        this.$actions.classList.add('hidden');
        this.$btnStart.textContent = 'Deal Next Hand';
        this.renderAISeats();
        if (event.message) this.addLog('🏆 ' + event.message);
        break;
    }
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────

  private renderTable(): void {
    this.renderCommunity();
    this.renderHumanCards();
    this.renderAISeats();
    this.updateChipDisplays();
    this.$pot.textContent = String(this.game.pot);
    this.$phase.textContent = this.phaseLabel(GamePhase.PreFlop);
    this.$gameControls.classList.add('hidden');
    this.$actions.classList.remove('hidden');
    this.updateActionButtons();
    this.updateHandDisplay();
    this.startStrengthUpdates();
  }

  private renderCommunity(): void {
    this.$community.innerHTML = '';
    const total = 5;
    const revealed = this.game.communityCards.length;
    for (let i = 0; i < total; i++) {
      if (i < revealed) {
        this.$community.appendChild(this.buildCard(this.game.communityCards[i]));
      } else {
        this.$community.appendChild(this.buildCardBack());
      }
    }
  }

  private renderHumanCards(): void {
    this.$humanCards.innerHTML = '';
    for (const card of this.game.players[0].holeCards) {
      this.$humanCards.appendChild(this.buildCard(card));
    }
  }

  private renderAISeats(): void {
    for (let i = 1; i < this.game.players.length; i++) {
      const seat = document.getElementById(`seat-${i}`);
      if (!seat) continue;
      const p = this.game.players[i];
      const isActive = this.game.activePlayerIndex === i && this.game.phase !== GamePhase.Waiting && this.game.phase !== GamePhase.Showdown;

      seat.className = 'player-seat' + (p.isFolded ? ' folded' : '') + (isActive ? ' active' : '');

      const cardsEl = seat.querySelector('.ai-cards')!;
      cardsEl.innerHTML = '';

      if (this.game.phase === GamePhase.Showdown && !p.isFolded && p.holeCards.length > 0) {
        for (const card of p.holeCards) cardsEl.appendChild(this.buildCard(card, true));
      } else if (p.holeCards.length > 0 && !p.isFolded) {
        cardsEl.appendChild(this.buildCardBack(true));
        cardsEl.appendChild(this.buildCardBack(true));
      }

      const nameEl = seat.querySelector('.seat-name') as HTMLElement;
      nameEl.textContent = `${p.avatar} ${p.name}`;

      const chipsEl = seat.querySelector('.seat-chips') as HTMLElement;
      chipsEl.textContent = `$${p.chips}`;
      if (p.currentBet > 0) chipsEl.textContent += ` (bet $${p.currentBet})`;

      const posEl = seat.querySelector('.seat-pos') as HTMLElement;
      posEl.textContent = this.game.phase !== GamePhase.Waiting ? this.game.getPosition(i) : '';

      const statusEl = seat.querySelector('.seat-status') as HTMLElement;
      if (p.isFolded) statusEl.textContent = '😔 Folded';
      else if (p.isAllIn) statusEl.textContent = '🔥 All-In';
      else if (isActive) statusEl.textContent = '🤔 Thinking…';
      else statusEl.textContent = '';
    }
  }

  private renderShowdown(): void {
    this.stopStrengthUpdates();
    // Reveal AI cards
    this.renderAISeats();
    // Show human cards too
    this.renderHumanCards();

    // Show best hand for human
    const human = this.game.players[0];
    if (!human.isFolded && human.holeCards.length > 0) {
      const result = HandEvaluator.evaluate([...human.holeCards, ...this.game.communityCards]);
      this.$handName.textContent = result.name;
      this.$handDesc.textContent = result.description;

      const tip = this.tips.getHandRankingInfo(result.rank);
      this.showTip({
        headline: `You made ${result.name}!`,
        body: `${result.description}. ${tip.name} — seen about ${tip.odds} hands.`,
      });
    }
  }

  private renderWaiting(): void {
    this.$community.innerHTML = '';
    for (let i = 0; i < 5; i++) this.$community.appendChild(this.buildCardBack());
    this.$humanCards.innerHTML = '';
    this.$handName.textContent = '';
    this.$handDesc.textContent = '';
    this.$pot.textContent = '0';
    this.$phase.textContent = 'Waiting to deal…';
    this.$actions.classList.add('hidden');
    this.$gameControls.classList.remove('hidden');
    this.$strengthFill.style.width = '0%';
    this.$strengthPct.textContent = '—';
    this.showTip({ headline: 'Welcome to Poker Tutor!', body: 'Hit "Deal Hand" to start playing Texas Hold\'em. Tips and hand strength will appear here as you play. Use the hand rankings button to study the hierarchy.' });
  }

  // ─── Action buttons ──────────────────────────────────────────────────────────

  private updateActionButtons(): void {
    if (!this.game.isHumanTurn()) {
      this.$actions.classList.add('hidden');
      return;
    }
    this.$actions.classList.remove('hidden');
    const available = this.game.getAvailableActions();
    const canCheck = available.includes('check');
    const canCall = available.includes('call');
    const canRaise = available.includes('raise');

    this.$btnCheck.style.display = canCheck ? '' : 'none';
    this.$btnCall.style.display = canCall ? '' : 'none';
    this.$btnRaise.style.display = canRaise ? '' : 'none';

    if (canCall) {
      const amt = this.game.getCallAmount();
      this.$callAmount.textContent = String(amt);
    }

    if (canRaise) {
      const min = this.game.getMinRaise();
      const max = this.game.getMaxRaise();
      this.$raiseSlider.min = String(min);
      this.$raiseSlider.max = String(max);
      this.$raiseSlider.step = String(this.game.bigBlind);
      this.$raiseSlider.value = String(min);
      this.$raiseAmount.textContent = String(min);
    }
  }

  private updateChipDisplays(): void {
    const human = this.game.players[0];
    this.$humanChips.textContent = String(human.chips);
    this.$humanPosition.textContent = this.game.phase !== GamePhase.Waiting
      ? this.game.getPosition(0)
      : '';
  }

  private updateHandDisplay(): void {
    const human = this.game.players[0];
    if (human.isFolded || human.holeCards.length === 0) return;

    const allCards = [...human.holeCards, ...this.game.communityCards];
    const result = HandEvaluator.evaluate(allCards);
    this.$handName.textContent = result.name;
    this.$handDesc.textContent = result.description;
  }

  // ─── Hand strength meter ─────────────────────────────────────────────────────

  private startStrengthUpdates(): void {
    this.stopStrengthUpdates();
    this.runStrengthUpdate();
    // Refresh at each phase change — triggered by community cards
  }

  private stopStrengthUpdates(): void {
    if (this.strengthInterval !== null) {
      clearInterval(this.strengthInterval);
      this.strengthInterval = null;
    }
  }

  runStrengthUpdate(): void {
    const human = this.game.players[0];
    if (human.isFolded || human.holeCards.length < 2) {
      this.$strengthFill.style.width = '0%';
      this.$strengthPct.textContent = '—';
      return;
    }

    const numOpponents = this.game.players.filter(p => !p.isFolded && !p.isHuman).length;
    const strength = HandEvaluator.estimateStrength(human.holeCards, this.game.communityCards, numOpponents);
    const pct = Math.round(strength * 100);

    this.$strengthFill.style.width = `${pct}%`;
    this.$strengthPct.textContent = `${pct}%`;

    // Color the bar
    if (pct < 25) this.$strengthFill.style.background = 'var(--strength-weak)';
    else if (pct < 50) this.$strengthFill.style.background = 'var(--strength-marginal)';
    else if (pct < 70) this.$strengthFill.style.background = 'var(--strength-moderate)';
    else this.$strengthFill.style.background = 'var(--strength-strong)';

    // Show strength-based tip if no phase tip recently
    const tip = this.tips.getTipForStrength(strength);
    // Only show occasionally — not on every refresh
  }

  // ─── Tips ────────────────────────────────────────────────────────────────────

  private showTip(tip: { headline: string; body: string }): void {
    this.$tipHeadline.textContent = tip.headline;
    this.$tipBody.textContent = tip.body;
  }

  // ─── Rankings modal ──────────────────────────────────────────────────────────

  private buildRankingsModal(): void {
    const ranks = [
      HandRank.RoyalFlush, HandRank.StraightFlush, HandRank.FourOfAKind,
      HandRank.FullHouse, HandRank.Flush, HandRank.Straight,
      HandRank.ThreeOfAKind, HandRank.TwoPair, HandRank.OnePair, HandRank.HighCard,
    ];
    let html = '<table class="rankings-table"><thead><tr><th>#</th><th>Hand</th><th>Example</th><th>Odds (5-card)</th></tr></thead><tbody>';
    ranks.forEach((rank, i) => {
      const info = this.tips.getHandRankingInfo(rank);
      html += `<tr><td>${i + 1}</td><td><strong>${info.name}</strong></td><td class="mono">${info.example}</td><td>${info.odds}</td></tr>`;
    });
    html += '</tbody></table>';
    this.$modalBody.innerHTML = html;
  }

  private showRankingsModal(): void {
    this.$modal.classList.remove('hidden');
  }

  // ─── Card builders ───────────────────────────────────────────────────────────

  private buildCard(card: Card, small = false): HTMLElement {
    const el = document.createElement('div');
    el.className = `card${card.isRed ? ' red' : ''}${small ? ' small' : ''}`;
    el.innerHTML = `
      <span class="rank-top">${card.displayValue}</span>
      <span class="suit-mid">${card.suitSymbol}</span>
      <span class="rank-bot">${card.displayValue}</span>
    `;
    return el;
  }

  private buildCardBack(small = false): HTMLElement {
    const el = document.createElement('div');
    el.className = `card face-down${small ? ' small' : ''}`;
    el.innerHTML = '<span class="card-back-pattern">🂠</span>';
    return el;
  }

  // ─── Log ─────────────────────────────────────────────────────────────────────

  private addLog(msg: string): void {
    this.logEntries.unshift(msg);
    if (this.logEntries.length > 40) this.logEntries.pop();
    this.$logEntries.innerHTML = this.logEntries
      .slice(0, 20)
      .map(e => `<div class="log-entry">${e}</div>`)
      .join('');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private renderAISeatsInit(): void {
    const container = this.q('#ai-seats');
    container.innerHTML = '';
    for (let i = 1; i < this.game.players.length; i++) {
      const p = this.game.players[i];
      container.innerHTML += `
        <div class="player-seat" id="seat-${i}">
          <div class="seat-name">${p.avatar} ${p.name}</div>
          <div class="ai-cards"></div>
          <div class="seat-chips">$${p.chips}</div>
          <div class="seat-pos"></div>
          <div class="seat-status"></div>
        </div>
      `;
    }
  }

  private phaseLabel(phase?: GamePhase): string {
    return {
      [GamePhase.Waiting]: 'Waiting…',
      [GamePhase.PreFlop]: 'Pre-Flop',
      [GamePhase.Flop]: 'Flop',
      [GamePhase.Turn]: 'Turn',
      [GamePhase.River]: 'River',
      [GamePhase.Showdown]: 'Showdown',
    }[phase ?? GamePhase.Waiting] ?? '—';
  }

  private q<T extends Element = HTMLElement>(selector: string): T {
    return document.querySelector<T>(selector)!;
  }

  // Public so main.ts can call after DOM ready
  renderAISeats_init(): void {
    this.renderAISeatsInit();
  }
}
