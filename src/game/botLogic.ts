import { Card, PlayedCard } from '../types/game';
import { determineTrickWinner, isCardPlayable, TRUMP_SUIT } from './rules';

/**
 * Calculates a bot's call based purely on the bot's own 13 cards:
 * - A counts as 1.0 expected trick
 * - K with at least 1 other card in suit counts as 0.7 expected trick
 * - Q with at least 2 other cards in suit counts as 0.5 expected trick
 * - Spades (Trump): Extra 0.3 trick per Spade beyond 3
 * Clamped between 2 and 6. Very rarely (if >= 8 high spades + aces), bumper 160.
 */
export function calculateBotCall(hand: Card[]): number {
  let estimatedTricks = 0;

  const suitCounts: Record<string, number> = { S: 0, H: 0, D: 0, C: 0 };
  const suitCards: Record<string, Card[]> = { S: [], H: [], D: [], C: [] };

  for (const card of hand) {
    suitCounts[card.suit]++;
    suitCards[card.suit].push(card);
  }

  // Count Aces & Kings & Queens
  for (const card of hand) {
    if (card.rank === 'A') {
      estimatedTricks += 1.0;
    } else if (card.rank === 'K' && suitCounts[card.suit] >= 2) {
      estimatedTricks += 0.7;
    } else if (card.rank === 'Q' && suitCounts[card.suit] >= 3) {
      estimatedTricks += 0.4;
    }
  }

  // Extra trump power
  if (suitCounts.S >= 4) {
    estimatedTricks += (suitCounts.S - 3) * 0.5;
  }

  // Round to nearest integer between 2 and 5
  let call = Math.round(estimatedTricks);
  if (call < 2) call = 2;
  if (call > 6) call = 6;

  return call;
}

/**
 * Chooses the best legal card for a bot to play without cheating.
 */
export function chooseBotCard(hand: Card[], currentTrick: PlayedCard[]): Card {
  const legalCards = hand.filter(c => isCardPlayable(c, hand, currentTrick));

  if (legalCards.length === 0) {
    // Fallback safeguard: if somehow empty, return first card in hand
    return hand[0];
  }

  // 1. If leading the trick:
  if (currentTrick.length === 0) {
    // Prefer cashing an Ace of non-trump suit if held
    const nonTrumpAces = legalCards.filter(c => c.suit !== TRUMP_SUIT && c.rank === 'A');
    if (nonTrumpAces.length > 0) {
      return nonTrumpAces[0];
    }
    // Otherwise lead a low card of a non-trump suit
    const nonTrumpCards = legalCards.filter(c => c.suit !== TRUMP_SUIT);
    if (nonTrumpCards.length > 0) {
      return nonTrumpCards.reduce((lowest, c) => (c.value < lowest.value ? c : lowest));
    }
    // If only trumps remain, lead the lowest trump
    return legalCards.reduce((lowest, c) => (c.value < lowest.value ? c : lowest));
  }

  // 2. Following in the trick:
  const currentBest = determineTrickWinner(currentTrick);
  const leadSuit = currentTrick[0].card.suit;

  // Filter legal cards that would win against currentBest
  const winningCards: Card[] = [];
  for (const card of legalCards) {
    const testTrick: PlayedCard[] = [...currentTrick, { seatIndex: 99, playerId: 'bot', card }];
    const testWinner = determineTrickWinner(testTrick);
    if (testWinner.seatIndex === 99) {
      winningCards.push(card);
    }
  }

  if (winningCards.length > 0) {
    // If we can win the trick, play the lowest winning card to conserve high cards
    return winningCards.reduce((minWin, c) => (c.value < minWin.value ? c : minWin));
  } else {
    // Cannot win the trick: play lowest legal card to sluff/save cards
    // If we have cards of lead suit, play lowest of lead suit
    const leadSuitCards = legalCards.filter(c => c.suit === leadSuit);
    if (leadSuitCards.length > 0) {
      return leadSuitCards.reduce((lowest, c) => (c.value < lowest.value ? c : lowest));
    }
    // Void in lead suit and cannot win (or choosing not to trump unnecessarily): discard lowest non-trump card
    const nonTrumpLegal = legalCards.filter(c => c.suit !== TRUMP_SUIT);
    if (nonTrumpLegal.length > 0) {
      return nonTrumpLegal.reduce((lowest, c) => (c.value < lowest.value ? c : lowest));
    }
    return legalCards.reduce((lowest, c) => (c.value < lowest.value ? c : lowest));
  }
}
