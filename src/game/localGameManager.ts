import { Card, GamePhase, PlayedCard, Player, RoomState, RoundHistoryEntry } from '../types/game';
import {
  calculatePlayerRoundScore,
  createDeck,
  determineTrickWinner,
  isCardPlayable,
  shuffleDeck,
  sortHand,
  validateDealDismissal,
  validateTotalCalls,
} from './rules';
import { calculateBotCall, chooseBotCard } from './botLogic';
import {
  playCardDealFlickSound,
  playCardPlaySound,
  playShuffleSound,
  playTrickCollectSound,
  playWinnerMusic,
} from '../utils/audio';

const STORAGE_KEY = 'mcg_saved_local_game';

export class LocalGameManager {
  private state: RoomState;
  private onStateChange: (state: RoomState) => void;
  private botTimer: NodeJS.Timeout | null = null;
  private dealTimer: NodeJS.Timeout | null = null;

  constructor(targetScore: 200 | 300 | 500 = 300, onStateChange: (state: RoomState) => void) {
    this.onStateChange = onStateChange;
    this.state = this.createInitialState(targetScore);
  }

  private createInitialState(targetScore: 200 | 300 | 500): RoomState {
    const human: Player = {
      id: 'local-human-0',
      name: 'You',
      avatar: 'user',
      isBot: false,
      seatIndex: 0,
      isConnected: true,
      missedTurns: 0,
    };

    const bot2: Player = {
      id: 'local-bot-1',
      name: 'Bot 2',
      avatar: 'bot-1',
      isBot: true,
      seatIndex: 1,
      isConnected: true,
      missedTurns: 0,
    };

    const bot3: Player = {
      id: 'local-bot-2',
      name: 'Bot 3',
      avatar: 'bot-2',
      isBot: true,
      seatIndex: 2,
      isConnected: true,
      missedTurns: 0,
    };

    const bot4: Player = {
      id: 'local-bot-3',
      name: 'Bot 4',
      avatar: 'bot-3',
      isBot: true,
      seatIndex: 3,
      isConnected: true,
      missedTurns: 0,
    };

    return {
      roomId: 'LOCAL',
      hostId: human.id,
      targetScore,
      phase: 'IDLE',
      roundNumber: 1,
      dealerSeat: 0,
      turnSeat: 1,
      seats: [human, bot2, bot3, bot4],
      playerHands: {
        [human.id]: [],
        [bot2.id]: [],
        [bot3.id]: [],
        [bot4.id]: [],
      },
      calls: {
        [human.id]: null,
        [bot2.id]: null,
        [bot3.id]: null,
        [bot4.id]: null,
      },
      tricksWon: {
        [human.id]: 0,
        [bot2.id]: 0,
        [bot3.id]: 0,
        [bot4.id]: 0,
      },
      scores: {
        [human.id]: 0,
        [bot2.id]: 0,
        [bot3.id]: 0,
        [bot4.id]: 0,
      },
      currentTrick: [],
      trickLeaderSeat: 1,
      reconnectTimers: {},
      history: [],
      redealingNotice: null,
      lastTrickWinnerSeat: null,
      dismissalInfo: null,
      dealingIndex: 0,
      dealingSeat: 0,
    };
  }

  public getState(): RoomState {
    return this.state;
  }

  public setHumanPlayerInfo(name: string, avatar: string): void {
    if (this.state.seats[0]) {
      this.state.seats[0].name = name;
      this.state.seats[0].avatar = avatar;
      this.notify();
    }
  }

  public enterGame(): void {
    this.clearAllTimers();
    // Premium 2-3 second opening animation when entering gameplay
    this.state.phase = 'ENTERING';
    this.notify();

    setTimeout(() => {
      this.startNewRound();
    }, 2400);
  }

  public startNewRound(): void {
    this.clearAllTimers();
    this.state.phase = 'SHUFFLING';
    this.state.redealingNotice = null;
    this.state.lastTrickWinnerSeat = null;
    this.state.dismissalInfo = null;
    this.state.currentTrick = [];
    this.state.dealingIndex = 0;
    this.state.dealingSeat = 0;

    // Reset trick counts, calls, and hands for new round
    for (const seat of this.state.seats) {
      if (seat) {
        this.state.calls[seat.id] = null;
        this.state.tricksWon[seat.id] = 0;
        this.state.playerHands[seat.id] = [];
      }
    }

    // Realistic 4-5 second card shuffle animation & sound
    playShuffleSound();
    this.notify();

    setTimeout(() => {
      // 0.5-1 second pause after shuffle
      this.state.phase = 'POST_SHUFFLE_PAUSE';
      this.notify();

      setTimeout(() => {
        this.startSequentialDealing();
      }, 800);
    }, 4400);
  }

  /**
   * Deal all 52 cards one card at a time in sequence:
   * P1 -> P2 -> P3 -> P4 -> repeat until all 52 cards are dealt.
   * Approximately 0.28s movement with 0.12s spacing (total ~6.5 seconds).
   */
  private startSequentialDealing(): void {
    const fullDeck = shuffleDeck(createDeck());
    const handsAccumulator: Card[][] = [[], [], [], []];
    this.state.phase = 'DEALING';
    this.state.dealingIndex = 0;
    this.notify();

    let cardIdx = 0;
    const dealInterval = 125; // 125ms spacing * 52 cards = 6.5s total dealing

    const stepDeal = () => {
      if (cardIdx >= 52) {
        // Complete dealing, sort hands neatly and start short hand settling animation
        const human = this.state.seats[0]!;
        const bot1 = this.state.seats[1]!;
        const bot2 = this.state.seats[2]!;
        const bot3 = this.state.seats[3]!;

        this.state.playerHands[human.id] = sortHand(handsAccumulator[0]);
        this.state.playerHands[bot1.id] = sortHand(handsAccumulator[1]);
        this.state.playerHands[bot2.id] = sortHand(handsAccumulator[2]);
        this.state.playerHands[bot3.id] = sortHand(handsAccumulator[3]);

        this.state.phase = 'HAND_SETTLING';
        this.notify();

        // After hand settling, validate dismissal rules before Call Phase
        setTimeout(() => {
          this.checkDealDismissal(handsAccumulator);
        }, 1300);
        return;
      }

      const targetSeat = cardIdx % 4; // P1 -> P2 -> P3 -> P4
      const card = fullDeck[cardIdx];
      handsAccumulator[targetSeat].push(card);

      const targetPlayer = this.state.seats[targetSeat]!;
      this.state.playerHands[targetPlayer.id] = [...handsAccumulator[targetSeat]];
      this.state.dealingIndex = cardIdx;
      this.state.dealingSeat = targetSeat;

      playCardDealFlickSound();
      this.notify();

      cardIdx++;
      this.dealTimer = setTimeout(stepDeal, dealInterval);
    };

    stepDeal();
  }

  /**
   * DISMISS VALIDATION:
   * Validates required Spades condition and required J/Q/K/A honor cards condition.
   * If not satisfied, dismisses round/game and does NOT start Call or Trick phase.
   */
  private checkDealDismissal(hands: Card[][]): void {
    const dismissal = validateDealDismissal(hands);

    if (dismissal.dismissed) {
      this.state.phase = 'DISMISSED';
      this.state.dismissalInfo = {
        reason: dismissal.reason!,
        message: dismissal.message!,
        playerSeat: dismissal.playerSeat!,
      };
      this.notify();
      return;
    }

    // Dismissal conditions satisfied: Move to Call phase
    this.state.phase = 'CALLING';
    this.notify();
  }

  public redealDismissedRound(): void {
    if (this.state.phase === 'DISMISSED') {
      this.startNewRound();
    }
  }

  public makeHumanCall(callValue: number): void {
    if (this.state.phase !== 'CALLING') return;
    const human = this.state.seats[0];
    if (!human) return;

    this.state.calls[human.id] = callValue;
    this.notify();

    // Sequential bot calling: P1 (done) -> P2 -> P3 -> P4
    const bot1 = this.state.seats[1]!;
    const bot2 = this.state.seats[2]!;
    const bot3 = this.state.seats[3]!;

    setTimeout(() => {
      if (this.state.phase !== 'CALLING') return;
      this.state.calls[bot1.id] = calculateBotCall(this.state.playerHands[bot1.id]);
      this.notify();

      setTimeout(() => {
        if (this.state.phase !== 'CALLING') return;
        this.state.calls[bot2.id] = calculateBotCall(this.state.playerHands[bot2.id]);
        this.notify();

        setTimeout(() => {
          if (this.state.phase !== 'CALLING') return;
          this.state.calls[bot3.id] = calculateBotCall(this.state.playerHands[bot3.id]);
          this.notify();

          // All 4 players have called: Validate minimum combined call >= 9
          const allCalls = [
            this.state.calls[human.id],
            this.state.calls[bot1.id],
            this.state.calls[bot2.id],
            this.state.calls[bot3.id],
          ];

          const validation = validateTotalCalls(allCalls);
          if (!validation.valid) {
            // Combined call < 9 => redeal required
            this.state.redealingNotice = `Combined total call is ${validation.totalNormal} (Min 9 required). Redealing round...`;
            this.notify();

            setTimeout(() => {
              this.startNewRound();
            }, 2500);
            return;
          }

          // Start trick play only after all calls are confirmed & validated
          setTimeout(() => {
            const startingSeat = (this.state.dealerSeat + 1) % 4;
            this.state.turnSeat = startingSeat;
            this.state.trickLeaderSeat = startingSeat;
            this.state.phase = 'PLAYING';
            this.notify();

            this.checkBotTurn();
          }, 800);
        }, 750);
      }, 750);
    }, 750);
  }

  public editHumanCall(): void {
    if (this.state.phase === 'CALLING') {
      const human = this.state.seats[0];
      if (human) {
        this.state.calls[human.id] = null;
        this.notify();
      }
    }
  }

  public playHumanCard(card: Card): void {
    if (this.state.phase !== 'PLAYING') return;
    if (this.state.turnSeat !== 0) return;

    const human = this.state.seats[0];
    if (!human) return;

    const hand = this.state.playerHands[human.id] || [];
    if (!isCardPlayable(card, hand, this.state.currentTrick)) {
      return;
    }

    playCardPlaySound();
    this.state.playerHands[human.id] = hand.filter(c => c.id !== card.id);
    const playedCard: PlayedCard = {
      seatIndex: 0,
      playerId: human.id,
      card,
    };
    this.state.currentTrick.push(playedCard);

    this.advanceTurnAfterPlay();
  }

  private advanceTurnAfterPlay(): void {
    if (this.state.currentTrick.length === 4) {
      this.state.phase = 'TRICK_RESOLVING';
      const winner = determineTrickWinner(this.state.currentTrick);
      this.state.lastTrickWinnerSeat = winner.seatIndex;
      this.state.tricksWon[winner.playerId] = (this.state.tricksWon[winner.playerId] || 0) + 1;
      this.notify();

      setTimeout(() => {
        playTrickCollectSound();
        this.state.currentTrick = [];
        this.state.lastTrickWinnerSeat = null;

        const humanId = this.state.seats[0]!.id;
        const remainingCards = this.state.playerHands[humanId]?.length || 0;

        if (remainingCards === 0) {
          this.finishRound();
        } else {
          this.state.trickLeaderSeat = winner.seatIndex;
          this.state.turnSeat = winner.seatIndex;
          this.state.phase = 'PLAYING';
          this.notify();
          this.checkBotTurn();
        }
      }, 1200);
    } else {
      this.state.turnSeat = (this.state.turnSeat + 1) % 4;
      this.notify();
      this.checkBotTurn();
    }
  }

  private checkBotTurn(): void {
    this.clearBotTimer();
    if (this.state.phase !== 'PLAYING') return;

    const currentSeat = this.state.seats[this.state.turnSeat];
    if (!currentSeat || !currentSeat.isBot) return;

    this.botTimer = setTimeout(() => {
      if (this.state.phase !== 'PLAYING' || this.state.turnSeat !== currentSeat.seatIndex) {
        return;
      }

      const hand = this.state.playerHands[currentSeat.id] || [];
      if (hand.length === 0) return;

      const chosenCard = chooseBotCard(hand, this.state.currentTrick);
      playCardPlaySound();

      this.state.playerHands[currentSeat.id] = hand.filter(c => c.id !== chosenCard.id);
      const playedCard: PlayedCard = {
        seatIndex: currentSeat.seatIndex,
        playerId: currentSeat.id,
        card: chosenCard,
      };
      this.state.currentTrick.push(playedCard);

      this.advanceTurnAfterPlay();
    }, 700);
  }

  private finishRound(): void {
    this.state.phase = 'ROUND_SUMMARY';

    const roundScores: Record<string, number> = {};
    for (const seat of this.state.seats) {
      if (seat) {
        const call = this.state.calls[seat.id];
        const won = this.state.tricksWon[seat.id] || 0;
        const delta = calculatePlayerRoundScore(call, won);
        roundScores[seat.id] = delta;
        this.state.scores[seat.id] = (this.state.scores[seat.id] || 0) + delta;
      }
    }

    this.state.history.push({
      round: this.state.roundNumber,
      calls: { ...this.state.calls },
      tricksWon: { ...this.state.tricksWon },
      roundScores,
      totalScores: { ...this.state.scores },
    });

    const reachedTarget = Object.values(this.state.scores).some(s => s >= this.state.targetScore);
    if (reachedTarget) {
      this.state.phase = 'GAME_OVER';
      playWinnerMusic();
    }

    this.notify();
    this.saveStateToStorage();
  }

  public nextRound(): void {
    if (this.state.phase !== 'ROUND_SUMMARY') return;
    this.state.roundNumber++;
    this.state.dealerSeat = (this.state.dealerSeat + 1) % 4;
    this.startNewRound();
  }

  public restartGame(targetScore: 200 | 300 | 500 = this.state.targetScore): void {
    this.clearAllTimers();
    this.state = this.createInitialState(targetScore);
    this.clearStorage();
    this.enterGame();
  }

  private clearBotTimer(): void {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
  }

  private clearAllTimers(): void {
    this.clearBotTimer();
    if (this.dealTimer) {
      clearTimeout(this.dealTimer);
      this.dealTimer = null;
    }
  }

  private notify(): void {
    this.onStateChange({ ...this.state });
    if (this.state.phase !== 'IDLE' && this.state.phase !== 'GAME_OVER') {
      this.saveStateToStorage();
    }
  }

  public saveStateToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignore storage errors
    }
  }

  public static hasSavedGame(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return false;
      const parsed = JSON.parse(data) as RoomState;
      return parsed.phase !== 'IDLE' && parsed.phase !== 'GAME_OVER';
    } catch {
      return false;
    }
  }

  public loadSavedGame(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return false;
      const parsed = JSON.parse(data) as RoomState;
      if (parsed.phase === 'GAME_OVER') return false;

      this.state = parsed;
      this.notify();
      if (this.state.phase === 'PLAYING') {
        this.checkBotTurn();
      }
      return true;
    } catch {
      return false;
    }
  }

  public clearStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  public cleanup(): void {
    this.clearAllTimers();
  }
}
