export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export enum GamePhase {
  Waiting = 'waiting',
  PreFlop = 'preflop',
  Flop = 'flop',
  Turn = 'turn',
  River = 'river',
  Showdown = 'showdown',
}

export enum HandRank {
  HighCard = 1,
  OnePair = 2,
  TwoPair = 3,
  ThreeOfAKind = 4,
  Straight = 5,
  Flush = 6,
  FullHouse = 7,
  FourOfAKind = 8,
  StraightFlush = 9,
  RoyalFlush = 10,
}

export interface HandResult {
  rank: HandRank;
  name: string;
  description: string;
  tiebreaker: number[];
}

export type AIStyle = 'tight' | 'aggressive' | 'balanced';

export interface GameEvent {
  type: 'deal' | 'bet' | 'fold' | 'check' | 'call' | 'raise' | 'community' | 'showdown' | 'win' | 'phase' | 'message' | 'allin';
  player?: number;
  amount?: number;
  message: string;
  phase?: GamePhase;
}
