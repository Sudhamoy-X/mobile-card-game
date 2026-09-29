export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string; // e.g. "S-A"
  suit: Suit;
  rank: Rank;
  value: number; // 2 to 14 (A=14, K=13, Q=12, J=11)
}

export type PlayerType = 'human' | 'bot';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  seatIndex: number; // 0: Bottom (You), 1: Left, 2: Top, 3: Right
  isConnected: boolean;
  missedTurns: number;
}

export type GamePhase =
  | 'IDLE'
  | 'ENTERING'
  | 'SHUFFLING'
  | 'POST_SHUFFLE_PAUSE'
  | 'DEALING'
  | 'HAND_SETTLING'
  | 'DISMISSED'
  | 'CALLING'
  | 'PLAYING'
  | 'TRICK_RESOLVING'
  | 'ROUND_SUMMARY'
  | 'GAME_OVER';

export interface PlayedCard {
  seatIndex: number;
  playerId: string;
  card: Card;
}

export interface RoundHistoryEntry {
  round: number;
  calls: Record<string, number | null>;
  tricksWon: Record<string, number>;
  roundScores: Record<string, number>;
  totalScores: Record<string, number>;
}

export interface DismissalInfo {
  reason: 'NO_SPADES' | 'NO_HONORS';
  message: string;
  playerSeat: number;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  targetScore: 200 | 300 | 500;
  phase: GamePhase;
  roundNumber: number;
  dealerSeat: number;
  turnSeat: number;
  seats: (Player | null)[];
  playerHands: Record<string, Card[]>; // Server keeps all hands; client gets filtered hand
  calls: Record<string, number | null>;
  tricksWon: Record<string, number>;
  scores: Record<string, number>;
  currentTrick: PlayedCard[];
  trickLeaderSeat: number;
  reconnectTimers: Record<string, number>; // Remaining seconds for disconnected player
  history: RoundHistoryEntry[];
  redealingNotice?: string | null;
  lastTrickWinnerSeat?: number | null;
  dismissalInfo?: DismissalInfo | null;
  dealingIndex?: number;
  dealingSeat?: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatar: string;
  authProvider: 'guest' | 'google' | 'phone';
  phone?: string;
  email?: string;
}
