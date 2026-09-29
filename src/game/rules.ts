import { Card, PlayedCard, Rank, Suit } from '../types/game';

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

export const SUIT_NAMES: Record<Suit, string> = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

export const TRUMP_SUIT: Suit = 'S';
export const BUMPER_CALL = 8;
export const MIN_TOTAL_NORMAL_CALL = 9;

export interface DismissalResult {
  dismissed: boolean;
  reason?: 'NO_SPADES' | 'NO_HONORS';
  playerSeat?: number;
  message?: string;
}

/**
 * Dismiss validation before Call Phase:
 * - Validates required Spades condition (each player must hold at least 1 Spade)
 * - Validates required J/Q/K/A condition (each player must hold at least 1 honor card J, Q, K, or A)
 */
export function validateDealDismissal(hands: Card[][]): DismissalResult {
  for (let seat = 0; seat < hands.length; seat++) {
    const hand = hands[seat];
    // 1. Spades condition
    const hasSpade = hand.some(c => c.suit === TRUMP_SUIT);
    if (!hasSpade) {
      return {
        dismissed: true,
        reason: 'NO_SPADES',
        playerSeat: seat,
        message: `Round Dismissed: Seat ${seat + 1} has NO Spades. Required Spades condition not satisfied.`,
      };
    }

    // 2. J/Q/K/A condition
    const hasHonor = hand.some(c => ['J', 'Q', 'K', 'A'].includes(c.rank));
    if (!hasHonor) {
      return {
        dismissed: true,
        reason: 'NO_HONORS',
        playerSeat: seat,
        message: `Round Dismissed: Seat ${seat + 1} has NO J/Q/K/A honor cards. Required Honor condition not satisfied.`,
      };
    }
  }

  return { dismissed: false };
}

/**
 * Generates a full standard 52-card deck
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        value: RANK_VALUES[rank],
      });
    }
  }
  return deck;
}

/**
 * Cryptographically / pseudo-randomly shuffles cards
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Sorts cards in player's hand neatly by suit (Spades, Hearts, Clubs, Diamonds) and descending rank
 */
export function sortHand(hand: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = { S: 0, H: 1, C: 2, D: 3 };
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return b.value - a.value;
  });
}

/**
 * Deals 13 cards to each of the 4 seats
 */
export function dealCards(): Card[][] {
  const deck = shuffleDeck(createDeck());
  const hands: Card[][] = [[], [], [], []];
  for (let i = 0; i < 52; i++) {
    hands[i % 4].push(deck[i]);
  }
  return hands.map(sortHand);
}

/**
 * Checks if a card is legally playable in the current trick
 */
export function isCardPlayable(card: Card, hand: Card[], currentTrick: PlayedCard[]): boolean {
  // If this card is not in the hand, it cannot be played
  if (!hand.some(c => c.id === card.id)) return false;

  // Leading card: any card in hand can be played
  if (currentTrick.length === 0) return true;

  const leadSuit = currentTrick[0].card.suit;
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);

  // If player has cards of the lead suit, they MUST follow suit
  if (hasLeadSuit) {
    return card.suit === leadSuit;
  }

  // Otherwise, player has no cards of the lead suit, and can play any card
  return true;
}

/**
 * Evaluates the winner of a 4-card trick:
 * - Spades are Trump.
 * - Highest card of the leading suit wins unless a Spade is played.
 * - If Spade is played, highest Spade wins.
 */
export function determineTrickWinner(trick: PlayedCard[]): PlayedCard {
  if (trick.length === 0) {
    throw new Error('Cannot evaluate empty trick');
  }

  const leadSuit = trick[0].card.suit;
  const spadesPlayed = trick.filter(p => p.card.suit === TRUMP_SUIT);

  if (spadesPlayed.length > 0) {
    // Highest Spade wins
    return spadesPlayed.reduce((best, cur) => (cur.card.value > best.card.value ? cur : best));
  }

  // Highest card of the leading suit wins
  const leadSuitPlayed = trick.filter(p => p.card.suit === leadSuit);
  return leadSuitPlayed.reduce((best, cur) => (cur.card.value > best.card.value ? cur : best));
}

/**
 * Calculates score delta for a single player in a round:
 * - Normal calls:
 *   - Exact call: call × 10
 *   - Each trick above call: +1
 *   - Failed call: -(call × 10)
 * - Bumper Call (160):
 *   - Successful Bumper (wins 13 tricks): +160
 *   - Failed Bumper: -80
 */
export function calculatePlayerRoundScore(call: number | null, tricksWon: number): number {
  if (call === null) return 0;

  // 8 is the Bumper Call: Bumper success = +160, Bumper failure = -80
  if (call === BUMPER_CALL) {
    return tricksWon >= 8 ? 160 : -80;
  }

  // Normal calls 1 to 7:
  // Successful call = call × 10 plus +1 for every extra trick above called amount
  // Failed call = -(call × 10)
  if (tricksWon >= call) {
    const extra = tricksWon - call;
    return call * 10 + extra;
  } else {
    return -(call * 10);
  }
}

/**
 * Checks if minimum combined call total across all 4 players is at least 9
 */
export function validateTotalCalls(calls: (number | null)[]): { valid: boolean; totalNormal: number } {
  let combinedTotal = 0;
  for (const c of calls) {
    if (c !== null) {
      combinedTotal += c;
    }
  }
  return {
    valid: combinedTotal >= MIN_TOTAL_NORMAL_CALL,
    totalNormal: combinedTotal,
  };
}
