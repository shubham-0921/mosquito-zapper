import { HandRank, GamePhase } from './types';
import type { HandResult } from './types';

export interface Tip {
  headline: string;
  body: string;
}

const PREFLOP_TIPS: Tip[] = [
  {
    headline: 'Starting hand selection is everything',
    body: 'Only about 20% of starting hands are worth playing. Premium hands: AA, KK, QQ, JJ, AKs. Good hands: TT-88, AQs, AJs, KQs. Everything else needs the right position or situation.',
  },
  {
    headline: 'Position is power',
    body: 'The Button (dealer) is the best seat — you act last on every post-flop street. Being last means you have full information before deciding. Play tighter from early positions, looser from late positions.',
  },
  {
    headline: 'Pocket pairs love multi-way pots',
    body: 'Small-to-medium pairs (22–99) are best played cheaply in multi-way pots, hoping to flop a set (three of a kind). You\'ll hit a set roughly 1 in 8 times (12%).',
  },
  {
    headline: '3-betting for value and as a bluff',
    body: 'Re-raising (3-betting) before the flop builds big pots with premium hands and also works as a bluff. A 3-bet says "I have a very strong hand" — opponents must respect it.',
  },
  {
    headline: 'Suited connectors have hidden value',
    body: 'Hands like 7♣8♣ or J♥T♥ can make straights and flushes. They\'re best played cheaply and in position. Their value is implied odds — winning big when you hit.',
  },
];

const FLOP_TIPS: Tip[] = [
  {
    headline: 'The flop defines your hand',
    body: 'After the flop you\'ve seen 5 of your final 7 cards (71%). If the flop doesn\'t help you, it probably doesn\'t help your opponents either. But be cautious — the board texture matters.',
  },
  {
    headline: 'Continuation betting (c-betting)',
    body: 'If you raised pre-flop, a follow-up bet on the flop (called a c-bet) is usually correct. It represents a strong hand regardless of whether you connected. Use 50–70% of the pot size.',
  },
  {
    headline: 'Drawing hands: outs and pot odds',
    body: 'A flush draw has 9 outs; an open-ended straight draw has 8. Multiply outs × 2 to estimate your % chance of hitting on the next card. Compare this to the pot odds before calling.',
  },
  {
    headline: 'Top pair top kicker (TPTK)',
    body: 'Pairing the highest board card with your highest hole card is very strong. Be prepared to build a big pot with TPTK, but watch for straights and flushes on dangerous boards.',
  },
  {
    headline: 'Don\'t fall in love with your hand',
    body: 'Over-pairs and top pair can lose. If the board is very coordinated (e.g., 7♠8♠9♠), a simple top pair is vulnerable. Pay attention to what hands the board makes possible.',
  },
];

const TURN_TIPS: Tip[] = [
  {
    headline: 'The turn is a street for big decisions',
    body: 'Pots often double on the turn. This is where bluffs become expensive and drawing hands need proper pot odds. Assess whether your hand improved or your opponent\'s range strengthened.',
  },
  {
    headline: 'Semi-bluffing with draws',
    body: 'Betting with a flush or straight draw is called a semi-bluff. You might win immediately (fold equity) OR hit your draw. This dual-threat makes it a powerful play.',
  },
  {
    headline: 'Pot control with medium-strength hands',
    body: 'With a hand like middle pair or a weak top pair, checking the turn controls the pot size. You don\'t want a huge pot when you\'re not sure you have the best hand.',
  },
];

const RIVER_TIPS: Tip[] = [
  {
    headline: 'The river is all about value vs. bluff',
    body: 'On the river you either have a strong hand (bet for value), a missed draw (bluff or check-fold), or a mediocre hand (check-call or check-fold). Rarely bet a medium hand for "protection".',
  },
  {
    headline: 'Bluff when your story makes sense',
    body: 'A good bluff tells a consistent story. If you\'ve been betting like you have a straight, a river bluff on a completed board is believable. Random bluffs are easily read and called.',
  },
  {
    headline: 'Think about your opponent\'s range',
    body: 'What hands would your opponent call with? Only bet for value if you\'re ahead of enough of their calling range. If they only call with better hands, just check.',
  },
];

const SHOWDOWN_TIPS: Tip[] = [
  {
    headline: 'Review what happened',
    body: 'After each showdown, think about what you could have done differently. Was there a point where you should have folded? Or did you miss value by not betting enough?',
  },
  {
    headline: 'Hand reading skill',
    body: 'Notice what hands opponents showed. This tells you about their playing style — do they bluff often? Do they only bet big with monsters? Use this info in future hands.',
  },
];

const STRENGTH_TIPS: Record<string, Tip> = {
  weak: {
    headline: 'You\'re behind — be careful',
    body: 'With a weak holding, calling big bets is often a mistake. Consider your pot odds and whether you have the right price to see another card with a draw.',
  },
  marginal: {
    headline: 'Pot control territory',
    body: 'With a marginal hand, try to see the showdown cheaply. Check rather than bet, and call small bets but fold to large ones.',
  },
  moderate: {
    headline: 'Play your hand, but stay alert',
    body: 'You have a decent hand. Bet for value on safe boards, but be cautious if your opponent shows a lot of aggression or the board is dangerous.',
  },
  strong: {
    headline: 'Build the pot!',
    body: 'With a strong hand, your goal is to get as many chips in as possible. Bet and raise for value. Don\'t slow-play so much that opponents see free cards.',
  },
  monster: {
    headline: 'You\'re way ahead — extract maximum value',
    body: 'With a monster hand, let your opponents bluff or build a hand. Slow-playing (checking big hands) works here — let them catch up a little so they\'ll call big bets.',
  },
};

export class TipsEngine {
  private usedIndices: Map<GamePhase, number> = new Map();

  getTipForPhase(phase: GamePhase): Tip {
    let pool: Tip[];
    switch (phase) {
      case GamePhase.PreFlop: pool = PREFLOP_TIPS; break;
      case GamePhase.Flop:    pool = FLOP_TIPS;    break;
      case GamePhase.Turn:    pool = TURN_TIPS;    break;
      case GamePhase.River:   pool = RIVER_TIPS;   break;
      default:                pool = SHOWDOWN_TIPS; break;
    }
    const last = this.usedIndices.get(phase) ?? -1;
    const next = (last + 1) % pool.length;
    this.usedIndices.set(phase, next);
    return pool[next];
  }

  getTipForStrength(strength: number): Tip {
    if (strength < 0.25) return STRENGTH_TIPS.weak;
    if (strength < 0.45) return STRENGTH_TIPS.marginal;
    if (strength < 0.60) return STRENGTH_TIPS.moderate;
    if (strength < 0.80) return STRENGTH_TIPS.strong;
    return STRENGTH_TIPS.monster;
  }

  getHandRankingInfo(rank: HandRank): { name: string; odds: string; example: string } {
    const info: Record<HandRank, { name: string; odds: string; example: string }> = {
      [HandRank.RoyalFlush]:    { name: 'Royal Flush',    odds: '1 in 649,740',  example: 'A♠K♠Q♠J♠T♠' },
      [HandRank.StraightFlush]: { name: 'Straight Flush', odds: '1 in 72,193',   example: '9♥8♥7♥6♥5♥' },
      [HandRank.FourOfAKind]:   { name: 'Four of a Kind', odds: '1 in 4,165',    example: 'A♠A♥A♦A♣K♠' },
      [HandRank.FullHouse]:     { name: 'Full House',     odds: '1 in 694',      example: 'K♠K♥K♦Q♠Q♥' },
      [HandRank.Flush]:         { name: 'Flush',          odds: '1 in 509',      example: 'A♠J♠8♠5♠2♠' },
      [HandRank.Straight]:      { name: 'Straight',       odds: '1 in 255',      example: '9♠8♥7♦6♣5♠' },
      [HandRank.ThreeOfAKind]:  { name: 'Three of a Kind',odds: '1 in 47',       example: 'Q♠Q♥Q♦A♠K♣' },
      [HandRank.TwoPair]:       { name: 'Two Pair',       odds: '1 in 21',       example: 'A♠A♥K♦K♣Q♠' },
      [HandRank.OnePair]:       { name: 'One Pair',       odds: '1 in 2.4',      example: 'J♠J♥A♦K♣Q♠' },
      [HandRank.HighCard]:      { name: 'High Card',      odds: '1 in 1',        example: 'A♠Q♥9♦7♣3♠' },
    };
    return info[rank];
  }
}
