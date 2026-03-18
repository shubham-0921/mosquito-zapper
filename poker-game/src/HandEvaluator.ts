import { Card } from './Card';
import { HandRank } from './types';
import type { HandResult, Suit, CardValue } from './types';

export class HandEvaluator {
  /** Evaluate the best hand from 2–7 cards */
  static evaluate(cards: Card[]): HandResult {
    if (cards.length < 2) {
      return { rank: HandRank.HighCard, name: 'High Card', description: 'No hand yet', tiebreaker: [] };
    }
    if (cards.length < 5) {
      return this.evaluatePartial(cards);
    }
    const combos = this.combinations(cards, 5);
    let best: HandResult | null = null;
    for (const combo of combos) {
      const result = this.evaluate5(combo);
      if (!best || this.compare(result, best) > 0) best = result;
    }
    return best!;
  }

  static evaluate5(cards: Card[]): HandResult {
    const vals = cards.map(c => c.value).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);
    const { isStraight, straightHigh } = this.checkStraight(vals);

    const countMap = new Map<number, number>();
    for (const v of vals) countMap.set(v, (countMap.get(v) ?? 0) + 1);
    const counts = [...countMap.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const maxCount = counts[0][1];
    const secondCount = counts[1]?.[1] ?? 0;
    // tiebreaker: cards ordered by count desc, then value desc (e.g. trips first, then kickers)
    const tiebreaker = counts.flatMap(([v, c]) => Array(c).fill(v));

    if (isFlush && isStraight) {
      const isRoyal = straightHigh === 14;
      return {
        rank: isRoyal ? HandRank.RoyalFlush : HandRank.StraightFlush,
        name: isRoyal ? 'Royal Flush' : 'Straight Flush',
        description: isRoyal ? 'The ultimate hand — unbeatable!' : `Straight flush, ${HandEvaluator.vn(straightHigh)} high`,
        tiebreaker: [straightHigh],
      };
    }
    if (maxCount === 4) {
      return { rank: HandRank.FourOfAKind, name: 'Four of a Kind', description: `Four ${HandEvaluator.vn(counts[0][0])}s`, tiebreaker };
    }
    if (maxCount === 3 && secondCount >= 2) {
      return { rank: HandRank.FullHouse, name: 'Full House', description: `${HandEvaluator.vn(counts[0][0])}s full of ${HandEvaluator.vn(counts[1][0])}s`, tiebreaker };
    }
    if (isFlush) {
      return { rank: HandRank.Flush, name: 'Flush', description: `${HandEvaluator.vn(vals[0])}-high flush`, tiebreaker: vals };
    }
    if (isStraight) {
      return { rank: HandRank.Straight, name: 'Straight', description: `Straight to ${HandEvaluator.vn(straightHigh)}`, tiebreaker: [straightHigh] };
    }
    if (maxCount === 3) {
      return { rank: HandRank.ThreeOfAKind, name: 'Three of a Kind', description: `Three ${HandEvaluator.vn(counts[0][0])}s`, tiebreaker };
    }
    if (maxCount === 2 && secondCount === 2) {
      return { rank: HandRank.TwoPair, name: 'Two Pair', description: `${HandEvaluator.vn(counts[0][0])}s and ${HandEvaluator.vn(counts[1][0])}s`, tiebreaker };
    }
    if (maxCount === 2) {
      return { rank: HandRank.OnePair, name: 'Pair', description: `Pair of ${HandEvaluator.vn(counts[0][0])}s`, tiebreaker };
    }
    return { rank: HandRank.HighCard, name: 'High Card', description: `${HandEvaluator.vn(vals[0])} high`, tiebreaker: vals };
  }

  private static checkStraight(vals: number[]): { isStraight: boolean; straightHigh: number } {
    const unique = [...new Set(vals)].sort((a, b) => b - a);
    if (unique.length < 5) return { isStraight: false, straightHigh: 0 };

    // Scan for 5 consecutive values (handles 7-card hands)
    for (let i = 0; i <= unique.length - 5; i++) {
      const slice = unique.slice(i, i + 5);
      if (slice[0] - slice[4] === 4) return { isStraight: true, straightHigh: slice[0] };
    }
    // Wheel: A-2-3-4-5
    if (unique.includes(14) && unique.includes(2) && unique.includes(3) && unique.includes(4) && unique.includes(5)) {
      return { isStraight: true, straightHigh: 5 };
    }
    return { isStraight: false, straightHigh: 0 };
  }

  static compare(a: HandResult, b: HandResult): number {
    if (a.rank !== b.rank) return a.rank - b.rank;
    for (let i = 0; i < Math.max(a.tiebreaker.length, b.tiebreaker.length); i++) {
      const diff = (a.tiebreaker[i] ?? 0) - (b.tiebreaker[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  static combinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [first, ...rest] = arr;
    return [
      ...this.combinations(rest, k - 1).map(c => [first, ...c]),
      ...this.combinations(rest, k),
    ];
  }

  /**
   * Monte Carlo estimate of win probability (0–1) given hole cards + known community cards.
   * Simulates `iterations` random run-outs against `numOpponents` random hands.
   */
  static estimateStrength(
    holeCards: Card[],
    communityCards: Card[],
    numOpponents = 2,
    iterations = 400,
  ): number {
    const known = [...holeCards, ...communityCards];
    const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
    const values: CardValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const remaining: Card[] = [];
    for (const suit of suits) {
      for (const value of values) {
        if (!known.some(c => c.suit === suit && c.value === value)) {
          remaining.push(new Card(suit, value));
        }
      }
    }

    let score = 0;
    for (let i = 0; i < iterations; i++) {
      const shuffled = [...remaining].sort(() => Math.random() - 0.5);
      let idx = 0;
      const toComplete = 5 - communityCards.length;
      const fullCommunity = [...communityCards, ...shuffled.slice(idx, idx + toComplete)];
      idx += toComplete;

      const myHand = this.evaluate([...holeCards, ...fullCommunity]);
      let iWin = true;
      let isTie = false;

      for (let op = 0; op < numOpponents; op++) {
        if (idx + 2 > shuffled.length) break;
        const opHand = this.evaluate([...shuffled.slice(idx, idx + 2), ...fullCommunity]);
        idx += 2;
        const cmp = this.compare(myHand, opHand);
        if (cmp < 0) { iWin = false; break; }
        if (cmp === 0) isTie = true;
      }

      if (iWin && !isTie) score += 1;
      else if (isTie) score += 0.5;
    }
    return score / iterations;
  }

  private static evaluatePartial(cards: Card[]): HandResult {
    if (cards.length === 2) {
      const [a, b] = cards;
      if (a.value === b.value) {
        return { rank: HandRank.OnePair, name: 'Pocket Pair', description: `Pocket ${HandEvaluator.vn(a.value)}s`, tiebreaker: [a.value] };
      }
      const hi = Math.max(a.value, b.value);
      const lo = Math.min(a.value, b.value);
      const suited = a.suit === b.suit ? 'suited' : 'offsuit';
      return { rank: HandRank.HighCard, name: 'Hole Cards', description: `${HandEvaluator.vn(hi)}-${HandEvaluator.vn(lo)} ${suited}`, tiebreaker: [hi, lo] };
    }
    return { rank: HandRank.HighCard, name: '...', description: 'Waiting for more cards', tiebreaker: [] };
  }

  static vn(v: number): string {
    return ({ 14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack' } as Record<number, string>)[v] ?? String(v);
  }
}
