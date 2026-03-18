import { Card, Deck } from './Card';
import { HandEvaluator } from './HandEvaluator';
import { GamePhase } from './types';
import type { GameEvent, AIStyle } from './types';

export interface Player {
  id: number;
  name: string;
  chips: number;
  holeCards: Card[];
  currentBet: number;   // bet in the current betting round
  totalBet: number;     // total committed in this hand
  isFolded: boolean;
  isAllIn: boolean;
  isHuman: boolean;
  aiStyle: AIStyle;
  avatar: string;
}

type EventHandler = (event: GameEvent) => void;

export class PokerGame {
  players: Player[];
  communityCards: Card[] = [];
  pot = 0;
  currentBet = 0;
  dealerIndex = 0;
  activePlayerIndex = 0;
  phase = GamePhase.Waiting;
  handNumber = 0;
  readonly smallBlind = 10;
  readonly bigBlind = 20;

  private deck = new Deck();
  private handlers: EventHandler[] = [];
  private actedThisRound = new Set<number>(); // player ids who acted in current betting round

  constructor(numOpponents = 3) {
    const avatars = ['🤠', '🧠', '😎'];
    const names = ['Alice', 'Bob', 'Charlie'];
    const styles: AIStyle[] = ['tight', 'aggressive', 'balanced'];

    this.players = [
      { id: 0, name: 'You', chips: 1000, holeCards: [], currentBet: 0, totalBet: 0, isFolded: false, isAllIn: false, isHuman: true, aiStyle: 'balanced', avatar: '🙂' },
    ];
    for (let i = 0; i < Math.min(numOpponents, 3); i++) {
      this.players.push({
        id: i + 1, name: names[i], chips: 1000, holeCards: [],
        currentBet: 0, totalBet: 0, isFolded: false, isAllIn: false,
        isHuman: false, aiStyle: styles[i], avatar: avatars[i],
      });
    }
  }

  on(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  private emit(event: GameEvent): void {
    for (const h of this.handlers) h(event);
  }

  // ─── Start a new hand ───────────────────────────────────────────────────────

  startHand(): void {
    this.handNumber++;
    this.deck.reset();
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.actedThisRound.clear();

    for (const p of this.players) {
      p.holeCards = [];
      p.currentBet = 0;
      p.totalBet = 0;
      p.isFolded = p.chips === 0; // auto-fold busted players
      p.isAllIn = false;
    }

    this.phase = GamePhase.PreFlop;

    // Deal 2 hole cards each
    for (let i = 0; i < 2; i++) {
      for (const p of this.players) {
        if (!p.isFolded) p.holeCards.push(this.deck.deal());
      }
    }
    this.emit({ type: 'deal', message: `Hand #${this.handNumber} — cards dealt` });

    // Post blinds
    const sbIdx = (this.dealerIndex + 1) % this.players.length;
    const bbIdx = (this.dealerIndex + 2) % this.players.length;
    this._postBlind(sbIdx, this.smallBlind, 'small blind');
    this._postBlind(bbIdx, this.bigBlind, 'big blind');
    this.currentBet = this.bigBlind;

    this.emit({ type: 'phase', phase: GamePhase.PreFlop, message: 'Pre-Flop' });

    // Pre-flop: first to act is UTG (player after BB)
    const firstToAct = (bbIdx + 1) % this.players.length;
    this._startBetting(firstToAct);
  }

  private _postBlind(idx: number, amount: number, label: string): void {
    const p = this.players[idx];
    if (p.isFolded) return;
    const actual = Math.min(amount, p.chips);
    p.chips -= actual;
    p.currentBet += actual;
    p.totalBet += actual;
    this.pot += actual;
    this.emit({ type: 'bet', player: idx, amount: actual, message: `${p.name} posts ${label} ($${actual})` });
  }

  private _startBetting(firstIdx: number): void {
    this.actedThisRound.clear();
    this.activePlayerIndex = firstIdx;
    // Skip folded / all-in players
    this.activePlayerIndex = this._nextEligible(firstIdx, firstIdx, true);
    if (this.activePlayerIndex === -1) {
      this._nextPhase();
      return;
    }
    if (!this.players[this.activePlayerIndex].isHuman) {
      setTimeout(() => this._processAI(), 700 + Math.random() * 300);
    }
  }

  // ─── Human action entry point ───────────────────────────────────────────────

  humanAction(action: 'fold' | 'check' | 'call' | 'raise', raiseAmount?: number): void {
    if (!this.isHumanTurn()) return;
    this._processAction(this.activePlayerIndex, action, raiseAmount);
  }

  // ─── Core action handler ────────────────────────────────────────────────────

  private _processAction(idx: number, action: 'fold' | 'check' | 'call' | 'raise', raiseAmount?: number): void {
    const p = this.players[idx];

    switch (action) {
      case 'fold':
        p.isFolded = true;
        this.emit({ type: 'fold', player: idx, message: `${p.name} folds` });
        this.actedThisRound.add(p.id);
        break;

      case 'check':
        this.emit({ type: 'check', player: idx, message: `${p.name} checks` });
        this.actedThisRound.add(p.id);
        break;

      case 'call': {
        const toCall = Math.min(this.currentBet - p.currentBet, p.chips);
        p.chips -= toCall;
        p.currentBet += toCall;
        p.totalBet += toCall;
        this.pot += toCall;
        if (p.chips === 0) { p.isAllIn = true; this.emit({ type: 'allin', player: idx, message: `${p.name} is all-in!` }); }
        this.emit({ type: 'call', player: idx, amount: toCall, message: `${p.name} calls $${toCall}` });
        this.actedThisRound.add(p.id);
        break;
      }

      case 'raise': {
        const targetBet = raiseAmount ?? (this.currentBet + this.bigBlind);
        const toAdd = Math.min(targetBet - p.currentBet, p.chips);
        p.chips -= toAdd;
        p.currentBet += toAdd;
        p.totalBet += toAdd;
        this.pot += toAdd;
        this.currentBet = p.currentBet;
        if (p.chips === 0) { p.isAllIn = true; this.emit({ type: 'allin', player: idx, message: `${p.name} is all-in!` }); }
        this.emit({ type: 'raise', player: idx, amount: p.currentBet, message: `${p.name} raises to $${p.currentBet}` });
        // Re-open betting — everyone except this player must act again
        this.actedThisRound.clear();
        this.actedThisRound.add(p.id);
        break;
      }
    }

    this._advanceAction();
  }

  private _advanceAction(): void {
    // Check if only one active player remains
    const inHand = this.players.filter(p => !p.isFolded);
    if (inHand.length === 1) {
      this._endHand(inHand);
      return;
    }

    // Check if betting round is over
    if (this._bettingRoundComplete()) {
      this._nextPhase();
      return;
    }

    // Find next eligible player
    const next = this._nextEligible((this.activePlayerIndex + 1) % this.players.length, this.activePlayerIndex, false);
    if (next === -1) {
      this._nextPhase();
      return;
    }

    this.activePlayerIndex = next;
    if (!this.players[next].isHuman) {
      setTimeout(() => this._processAI(), 600 + Math.random() * 400);
    }
  }

  /** Returns true when all eligible players have acted and matched the current bet */
  private _bettingRoundComplete(): boolean {
    const canAct = this.players.filter(p => !p.isFolded && !p.isAllIn);
    if (canAct.length === 0) return true;
    const allActed = canAct.every(p => this.actedThisRound.has(p.id));
    const allMatched = canAct.every(p => p.currentBet === this.currentBet);
    return allActed && allMatched;
  }

  /**
   * Find the next eligible player (not folded, not all-in) starting from `startIdx`.
   * If `skipActed` = false, we look for anyone who hasn't matched or acted yet.
   * Returns -1 if none found.
   */
  private _nextEligible(startIdx: number, stopIdx: number, skipActed: boolean): number {
    const n = this.players.length;
    let idx = startIdx;
    let steps = 0;
    while (steps < n) {
      const p = this.players[idx];
      if (!p.isFolded && !p.isAllIn) {
        if (skipActed || !this.actedThisRound.has(p.id) || p.currentBet < this.currentBet) {
          return idx;
        }
      }
      idx = (idx + 1) % n;
      steps++;
    }
    return -1;
  }

  // ─── Phase transitions ───────────────────────────────────────────────────────

  private _nextPhase(): void {
    // Reset per-round bets
    for (const p of this.players) p.currentBet = 0;
    this.currentBet = 0;
    this.actedThisRound.clear();

    const inHand = this.players.filter(p => !p.isFolded);

    switch (this.phase) {
      case GamePhase.PreFlop:
        this.phase = GamePhase.Flop;
        this.communityCards.push(this.deck.deal(), this.deck.deal(), this.deck.deal());
        this.emit({ type: 'community', phase: GamePhase.Flop, message: 'Flop dealt' });
        break;
      case GamePhase.Flop:
        this.phase = GamePhase.Turn;
        this.communityCards.push(this.deck.deal());
        this.emit({ type: 'community', phase: GamePhase.Turn, message: 'Turn dealt' });
        break;
      case GamePhase.Turn:
        this.phase = GamePhase.River;
        this.communityCards.push(this.deck.deal());
        this.emit({ type: 'community', phase: GamePhase.River, message: 'River dealt' });
        break;
      case GamePhase.River:
        this._endHand(inHand);
        return;
      default:
        return;
    }

    this.emit({ type: 'phase', phase: this.phase, message: this.phase });

    // Post-flop first to act: first active player left of dealer
    let firstToAct = (this.dealerIndex + 1) % this.players.length;
    let attempts = 0;
    while ((this.players[firstToAct].isFolded || this.players[firstToAct].isAllIn) && attempts < this.players.length) {
      firstToAct = (firstToAct + 1) % this.players.length;
      attempts++;
    }
    this._startBetting(firstToAct);
  }

  // ─── Showdown / end hand ─────────────────────────────────────────────────────

  private _endHand(inHand: Player[]): void {
    this.phase = GamePhase.Showdown;

    if (inHand.length === 1) {
      const winner = inHand[0];
      winner.chips += this.pot;
      this.emit({ type: 'win', player: winner.id, amount: this.pot, message: `${winner.name} wins $${this.pot}!` });
    } else {
      // Evaluate everyone's best hand
      const results = inHand.map(p => ({
        player: p,
        hand: HandEvaluator.evaluate([...p.holeCards, ...this.communityCards]),
      }));
      results.sort((a, b) => HandEvaluator.compare(b.hand, a.hand));
      const best = results[0].hand;
      const winners = results.filter(r => HandEvaluator.compare(r.hand, best) === 0);

      for (const r of results) {
        this.emit({ type: 'showdown', player: r.player.id, message: `${r.player.name}: ${r.hand.name} — ${r.hand.description}` });
      }

      const share = Math.floor(this.pot / winners.length);
      for (const w of winners) w.player.chips += share;
      const wNames = winners.map(w => w.player.name).join(' & ');
      this.emit({ type: 'win', amount: this.pot, message: `${wNames} win${winners.length > 1 ? '' : 's'} $${this.pot} with ${best.name}!` });
    }

    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    this.emit({ type: 'phase', phase: GamePhase.Showdown, message: 'Showdown' });
  }

  // ─── AI logic ────────────────────────────────────────────────────────────────

  private _processAI(): void {
    const p = this.players[this.activePlayerIndex];
    if (p.isHuman || p.isFolded || p.isAllIn) return;

    const numOpponents = this.players.filter(x => !x.isFolded && x.id !== p.id).length;
    const strength = HandEvaluator.estimateStrength(p.holeCards, this.communityCards, numOpponents, 100);

    const toCall = this.currentBet - p.currentBet;
    const potOdds = toCall > 0 ? toCall / (this.pot + toCall) : 0;

    const aggFactor = p.aiStyle === 'aggressive' ? 0.12 : p.aiStyle === 'tight' ? 0.18 : 0.15;
    const bluffChance = p.aiStyle === 'aggressive' ? 0.1 : 0.03;
    const noise = (Math.random() - 0.5) * 0.1;

    let action: 'fold' | 'check' | 'call' | 'raise' = 'fold';
    let raiseAmt: number | undefined;

    if (toCall === 0) {
      if (strength + noise > 0.55) {
        action = 'raise';
        raiseAmt = Math.min(this.pot * (0.5 + Math.random() * 0.5) | 0, p.chips);
        raiseAmt = Math.max(raiseAmt, this.bigBlind);
      } else if (Math.random() < bluffChance) {
        action = 'raise';
        raiseAmt = this.bigBlind * 2;
      } else {
        action = 'check';
      }
    } else {
      if (strength + noise > potOdds + aggFactor) {
        if (strength > 0.72 && Math.random() < 0.35) {
          action = 'raise';
          raiseAmt = Math.min(this.currentBet + (this.bigBlind * (2 + Math.floor(Math.random() * 4))), p.chips + p.currentBet);
        } else {
          action = 'call';
        }
      } else if (Math.random() < bluffChance && toCall <= this.bigBlind * 2) {
        action = 'call';
      } else {
        action = 'fold';
      }
    }

    this._processAction(this.activePlayerIndex, action, raiseAmt);
  }

  // ─── Public helpers ──────────────────────────────────────────────────────────

  isHumanTurn(): boolean {
    return this.phase !== GamePhase.Waiting &&
      this.phase !== GamePhase.Showdown &&
      this.players[this.activePlayerIndex]?.isHuman === true &&
      !this.players[0].isFolded;
  }

  getAvailableActions(): ('fold' | 'check' | 'call' | 'raise')[] {
    const p = this.players[this.activePlayerIndex];
    if (!p.isHuman) return [];
    const acts: ('fold' | 'check' | 'call' | 'raise')[] = ['fold'];
    if (this.currentBet <= p.currentBet) acts.push('check');
    else acts.push('call');
    if (p.chips > this.currentBet - p.currentBet) acts.push('raise');
    return acts;
  }

  getCallAmount(): number {
    const p = this.players[this.activePlayerIndex];
    return Math.min(this.currentBet - p.currentBet, p.chips);
  }

  getMinRaise(): number {
    const p = this.players[this.activePlayerIndex];
    return Math.min(this.currentBet + this.bigBlind, p.chips + p.currentBet);
  }

  getMaxRaise(): number {
    return this.players[this.activePlayerIndex].chips + this.players[this.activePlayerIndex].currentBet;
  }

  getPosition(playerIdx: number): string {
    const n = this.players.length;
    const rel = (playerIdx - this.dealerIndex + n) % n;
    const map: Record<number, string> = { 0: 'BTN', 1: 'SB', 2: 'BB', 3: 'UTG' };
    return map[rel] ?? 'MP';
  }

  getPositionFull(playerIdx: number): string {
    const n = this.players.length;
    const rel = (playerIdx - this.dealerIndex + n) % n;
    const map: Record<number, string> = {
      0: 'Button (Dealer) — best position!',
      1: 'Small Blind — must act early post-flop',
      2: 'Big Blind — last to act pre-flop',
      3: 'Under the Gun — first to act pre-flop',
    };
    return map[rel] ?? 'Middle Position';
  }
}
