import type { Suit, CardValue } from './types';

export class Card {
  constructor(public readonly suit: Suit, public readonly value: CardValue) {}

  get displayValue(): string {
    const face: Partial<Record<number, string>> = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J' };
    return face[this.value] ?? String(this.value);
  }

  get suitSymbol(): string {
    return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[this.suit];
  }

  get isRed(): boolean {
    return this.suit === 'hearts' || this.suit === 'diamonds';
  }

  toString(): string {
    return `${this.displayValue}${this.suitSymbol}`;
  }
}

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
    const values: CardValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    this.cards = [];
    for (const suit of suits) {
      for (const value of values) {
        this.cards.push(new Card(suit, value));
      }
    }
    this.shuffle();
  }

  private shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(): Card {
    if (this.cards.length === 0) throw new Error('Deck is empty');
    return this.cards.pop()!;
  }
}
