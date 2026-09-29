import { Server, Socket } from 'socket.io';
import { Card, GamePhase, PlayedCard, Player, RoomState, RoundHistoryEntry } from '../src/types/game';
import {
  calculatePlayerRoundScore,
  dealCards,
  determineTrickWinner,
  isCardPlayable,
  validateDealDismissal,
  validateTotalCalls,
} from '../src/game/rules';
import { calculateBotCall, chooseBotCard } from '../src/game/botLogic';

interface PlayerSession {
  socketId: string | null;
  playerId: string;
  name: string;
  avatar: string;
  roomCode: string;
  seatIndex: number;
}

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private sessions: Map<string, PlayerSession> = new Map(); // playerId -> PlayerSession
  private socketToPlayer: Map<string, string> = new Map(); // socketId -> playerId
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map(); // playerId -> timer
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Generates unique 4-digit room code e.g. "4829"
   */
  public generateRoomCode(): string {
    let code = '';
    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (this.rooms.has(code));
    return code;
  }

  public createRoom(
    hostId: string,
    hostName: string,
    hostAvatar: string,
    targetScore: 200 | 300 | 500 = 300
  ): RoomState {
    const code = this.generateRoomCode();
    const hostPlayer: Player = {
      id: hostId,
      name: hostName,
      avatar: hostAvatar,
      isBot: false,
      seatIndex: 0,
      isConnected: true,
      missedTurns: 0,
    };

    const roomState: RoomState = {
      roomId: code,
      hostId,
      targetScore,
      phase: 'IDLE',
      roundNumber: 1,
      dealerSeat: 0,
      turnSeat: 1,
      seats: [hostPlayer, null, null, null],
      playerHands: {
        [hostId]: [],
      },
      calls: {
        [hostId]: null,
      },
      tricksWon: {
        [hostId]: 0,
      },
      scores: {
        [hostId]: 0,
      },
      currentTrick: [],
      trickLeaderSeat: 1,
      reconnectTimers: {},
      history: [],
      redealingNotice: null,
      lastTrickWinnerSeat: null,
    };

    this.rooms.set(code, roomState);
    this.sessions.set(hostId, {
      socketId: null,
      playerId: hostId,
      name: hostName,
      avatar: hostAvatar,
      roomCode: code,
      seatIndex: 0,
    });

    return roomState;
  }

  public getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code);
  }

  public joinRoom(
    code: string,
    playerId: string,
    name: string,
    avatar: string
  ): { success: boolean; error?: string; room?: RoomState } {
    const room = this.rooms.get(code);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Check if player is already seated in this room (reconnection or existing)
    const existingSeat = room.seats.findIndex(s => s && s.id === playerId);
    if (existingSeat !== -1) {
      const player = room.seats[existingSeat]!;
      player.isConnected = true;
      player.name = name || player.name;
      delete room.reconnectTimers[playerId];

      if (this.disconnectTimers.has(playerId)) {
        clearInterval(this.disconnectTimers.get(playerId)!);
        this.disconnectTimers.delete(playerId);
      }

      this.sessions.set(playerId, {
        socketId: null,
        playerId,
        name: player.name,
        avatar: player.avatar,
        roomCode: code,
        seatIndex: existingSeat,
      });

      return { success: true, room };
    }

    // New player trying to join
    if (room.phase !== 'IDLE') {
      return { success: false, error: 'Game has already started in this room' };
    }

    const emptySeatIndex = room.seats.findIndex(s => s === null);
    if (emptySeatIndex === -1) {
      return { success: false, error: 'Room is full (all 4 seats taken)' };
    }

    const newPlayer: Player = {
      id: playerId,
      name,
      avatar,
      isBot: false,
      seatIndex: emptySeatIndex,
      isConnected: true,
      missedTurns: 0,
    };

    room.seats[emptySeatIndex] = newPlayer;
    room.playerHands[playerId] = [];
    room.calls[playerId] = null;
    room.tricksWon[playerId] = 0;
    room.scores[playerId] = 0;

    this.sessions.set(playerId, {
      socketId: null,
      playerId,
      name,
      avatar,
      roomCode: code,
      seatIndex: emptySeatIndex,
    });

    return { success: true, room };
  }

  public addBot(code: string, requesterId: string): boolean {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== requesterId || room.phase !== 'IDLE') return false;

    const emptySeatIndex = room.seats.findIndex(s => s === null);
    if (emptySeatIndex === -1) return false;

    const botNumber = emptySeatIndex + 1;
    const botId = `bot-${code}-${emptySeatIndex}`;
    const botPlayer: Player = {
      id: botId,
      name: `Bot ${botNumber}`,
      avatar: `bot-${emptySeatIndex}`,
      isBot: true,
      seatIndex: emptySeatIndex,
      isConnected: true,
      missedTurns: 0,
    };

    room.seats[emptySeatIndex] = botPlayer;
    room.playerHands[botId] = [];
    room.calls[botId] = null;
    room.tricksWon[botId] = 0;
    room.scores[botId] = 0;

    this.broadcastRoom(code);
    return true;
  }

  public removeBot(code: string, requesterId: string, seatIndex: number): boolean {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== requesterId || room.phase !== 'IDLE') return false;

    const player = room.seats[seatIndex];
    if (!player || !player.isBot) return false;

    delete room.playerHands[player.id];
    delete room.calls[player.id];
    delete room.tricksWon[player.id];
    delete room.scores[player.id];
    room.seats[seatIndex] = null;

    this.broadcastRoom(code);
    return true;
  }

  public startGame(code: string, requesterId: string): boolean {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== requesterId || room.phase !== 'IDLE') return false;

    // Check all 4 seats are filled
    const allSeatsFilled = room.seats.every(s => s !== null);
    if (!allSeatsFilled) return false;

    this.startRound(room);
    return true;
  }

  private startRound(room: RoomState): void {
    room.phase = 'SHUFFLING';
    room.redealingNotice = null;
    room.lastTrickWinnerSeat = null;
    room.currentTrick = [];

    for (const seat of room.seats) {
      if (seat) {
        room.calls[seat.id] = null;
        room.tricksWon[seat.id] = 0;
      }
    }

    this.broadcastRoom(room.roomId);

    // 3.2s shuffle period
    setTimeout(() => {
      const hands = dealCards();
      for (let i = 0; i < 4; i++) {
        const player = room.seats[i]!;
        room.playerHands[player.id] = hands[i];
      }

      // Step 1-5: Complete dealing and let players inspect their full 13 cards
      room.phase = 'HAND_SETTLING';
      this.broadcastRoom(room.roomId);

      // Validate dismissal condition before Call phase
      const allHands = [hands[0], hands[1], hands[2], hands[3]];
      const dismissal = validateDealDismissal(allHands);

      if (dismissal.dismissed) {
        room.phase = 'DISMISSED';
        room.dismissalInfo = {
          reason: dismissal.reason!,
          message: dismissal.message!,
          playerSeat: dismissal.playerSeat!,
        };
        this.broadcastRoom(room.roomId);
        return;
      }

      // After hand-settling inspection period, activate CALLING phase
      setTimeout(() => {
        if (room.phase !== 'HAND_SETTLING') return;
        room.phase = 'CALLING';
        this.broadcastRoom(room.roomId);

        // Compute bot calls with slight sequential delay so players can see calls arrive
        const botSeats = room.seats.filter(s => s && s.isBot);
        botSeats.forEach((bot, index) => {
          setTimeout(() => {
            if (room.phase === 'CALLING' && bot && room.calls[bot.id] === null) {
              room.calls[bot.id] = calculateBotCall(room.playerHands[bot.id]);
              this.broadcastRoom(room.roomId);
              this.checkAllCallsComplete(room);
            }
          }, 1000 + index * 800);
        });
      }, 2600);
    }, 3200);
  }

  public redealDismissed(code: string, requesterId: string): boolean {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== requesterId || room.phase !== 'DISMISSED') return false;
    this.startRound(room);
    return true;
  }

  public makeCall(code: string, playerId: string, callValue: number): boolean {
    const room = this.rooms.get(code);
    if (!room || room.phase !== 'CALLING') return false;

    const seat = room.seats.find(s => s && s.id === playerId);
    if (!seat) return false;

    room.calls[playerId] = callValue;
    this.broadcastRoom(code);

    this.checkAllCallsComplete(room);
    return true;
  }

  private checkAllCallsComplete(room: RoomState): void {
    const allHaveCalled = room.seats.every(s => s && room.calls[s.id] !== null);
    if (!allHaveCalled) return;

    // Validate calls: sum of normal calls >= 9
    const callsList = room.seats.map(s => room.calls[s!.id]);
    const validation = validateTotalCalls(callsList);

    if (!validation.valid) {
      room.redealingNotice = `Total normal call is ${validation.totalNormal} (Min 9 required). Redealing round...`;
      this.broadcastRoom(room.roomId);

      setTimeout(() => {
        this.startRound(room);
      }, 2500);
      return;
    }

    // Calls complete!
    const startingSeat = (room.dealerSeat + 1) % 4;
    room.turnSeat = startingSeat;
    room.trickLeaderSeat = startingSeat;
    room.phase = 'PLAYING';
    this.broadcastRoom(room.roomId);

    this.checkTurnAction(room);
  }

  public playCard(code: string, playerId: string, card: Card): boolean {
    const room = this.rooms.get(code);
    if (!room || room.phase !== 'PLAYING') return false;

    const currentSeat = room.seats[room.turnSeat];
    if (!currentSeat || currentSeat.id !== playerId) return false;

    const hand = room.playerHands[playerId] || [];
    if (!isCardPlayable(card, hand, room.currentTrick)) return false;

    // Valid play
    room.playerHands[playerId] = hand.filter(c => c.id !== card.id);
    const playedCard: PlayedCard = {
      seatIndex: currentSeat.seatIndex,
      playerId,
      card,
    };
    room.currentTrick.push(playedCard);

    // Reset missed turns if player was connected and played
    currentSeat.missedTurns = 0;

    this.advanceTrickPlay(room);
    return true;
  }

  private advanceTrickPlay(room: RoomState): void {
    if (room.currentTrick.length === 4) {
      // Trick is finished
      room.phase = 'TRICK_RESOLVING';
      const winner = determineTrickWinner(room.currentTrick);
      room.lastTrickWinnerSeat = winner.seatIndex;
      room.tricksWon[winner.playerId] = (room.tricksWon[winner.playerId] || 0) + 1;
      this.broadcastRoom(room.roomId);

      setTimeout(() => {
        room.currentTrick = [];
        room.lastTrickWinnerSeat = null;

        // Check if 13 tricks complete
        const anySeat = room.seats[0]!;
        const remaining = room.playerHands[anySeat.id]?.length || 0;

        if (remaining === 0) {
          this.finishRound(room);
        } else {
          room.trickLeaderSeat = winner.seatIndex;
          room.turnSeat = winner.seatIndex;
          room.phase = 'PLAYING';
          this.broadcastRoom(room.roomId);
          this.checkTurnAction(room);
        }
      }, 1200);
    } else {
      room.turnSeat = (room.turnSeat + 1) % 4;
      this.broadcastRoom(room.roomId);
      this.checkTurnAction(room);
    }
  }

  private checkTurnAction(room: RoomState): void {
    if (room.phase !== 'PLAYING') return;

    const currentSeat = room.seats[room.turnSeat];
    if (!currentSeat) return;

    // 1. If Bot turn:
    if (currentSeat.isBot) {
      setTimeout(() => {
        if (room.phase !== 'PLAYING' || room.turnSeat !== currentSeat.seatIndex) return;
        const hand = room.playerHands[currentSeat.id] || [];
        if (hand.length === 0) return;

        const botCard = chooseBotCard(hand, room.currentTrick);
        this.playCard(room.roomId, currentSeat.id, botCard);
      }, 700);
      return;
    }

    // 2. If Human turn but disconnected:
    if (!currentSeat.isConnected) {
      currentSeat.missedTurns++;
      // If player misses 2 required turns after failing to reconnect, replace control with a bot
      if (currentSeat.missedTurns >= 2) {
        currentSeat.isBot = true;
        currentSeat.name = `${currentSeat.name} (Bot)`;
        this.broadcastRoom(room.roomId);
      }

      // Auto-play for disconnected human
      setTimeout(() => {
        if (room.phase !== 'PLAYING' || room.turnSeat !== currentSeat.seatIndex) return;
        const hand = room.playerHands[currentSeat.id] || [];
        if (hand.length === 0) return;
        const fallbackCard = chooseBotCard(hand, room.currentTrick);
        this.playCard(room.roomId, currentSeat.id, fallbackCard);
      }, 1000);
    }
  }

  private finishRound(room: RoomState): void {
    room.phase = 'ROUND_SUMMARY';

    const roundScores: Record<string, number> = {};
    for (const seat of room.seats) {
      if (seat) {
        const call = room.calls[seat.id];
        const won = room.tricksWon[seat.id] || 0;
        const delta = calculatePlayerRoundScore(call, won);
        roundScores[seat.id] = delta;
        room.scores[seat.id] = (room.scores[seat.id] || 0) + delta;
      }
    }

    room.history.push({
      round: room.roundNumber,
      calls: { ...room.calls },
      tricksWon: { ...room.tricksWon },
      roundScores,
      totalScores: { ...room.scores },
    });

    const reachedTarget = Object.values(room.scores).some(s => s >= room.targetScore);
    if (reachedTarget) {
      room.phase = 'GAME_OVER';
    }

    this.broadcastRoom(room.roomId);
  }

  public nextRound(code: string, requesterId: string): boolean {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== requesterId || room.phase !== 'ROUND_SUMMARY') return false;

    room.roundNumber++;
    room.dealerSeat = (room.dealerSeat + 1) % 4;
    this.startRound(room);
    return true;
  }

  public restartGame(code: string, requesterId: string): boolean {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== requesterId) return false;

    room.roundNumber = 1;
    room.dealerSeat = 0;
    room.turnSeat = 1;
    room.history = [];
    for (const seat of room.seats) {
      if (seat) {
        room.scores[seat.id] = 0;
        room.tricksWon[seat.id] = 0;
        room.calls[seat.id] = null;
        room.playerHands[seat.id] = [];
      }
    }
    this.startRound(room);
    return true;
  }

  // Socket connection handlers
  public handleSocketConnect(socket: Socket, playerId: string, name: string, avatar: string, roomCode?: string): void {
    this.socketToPlayer.set(socket.id, playerId);

    if (roomCode && this.rooms.has(roomCode)) {
      const room = this.rooms.get(roomCode)!;
      const seat = room.seats.find(s => s && s.id === playerId);
      if (seat) {
        seat.isConnected = true;
        delete room.reconnectTimers[playerId];

        if (this.disconnectTimers.has(playerId)) {
          clearInterval(this.disconnectTimers.get(playerId)!);
          this.disconnectTimers.delete(playerId);
        }

        socket.join(`room:${roomCode}`);
        this.broadcastRoom(roomCode);
      }
    }
  }

  public handleSocketDisconnect(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    this.socketToPlayer.delete(socket.id);
    if (!playerId) return;

    const session = this.sessions.get(playerId);
    if (!session) return;

    const room = this.rooms.get(session.roomCode);
    if (!room) return;

    const playerSeat = room.seats.find(s => s && s.id === playerId);
    if (!playerSeat) return;

    // Preserve disconnected player's seat, cards, call, score, tricks, and state
    playerSeat.isConnected = false;
    room.reconnectTimers[playerId] = 30; // Synchronized 30-second reconnect timer

    this.broadcastRoom(room.roomId);

    // Clear any previous timer
    if (this.disconnectTimers.has(playerId)) {
      clearInterval(this.disconnectTimers.get(playerId)!);
    }

    const interval = setInterval(() => {
      if (!room.reconnectTimers[playerId] || room.reconnectTimers[playerId] <= 1) {
        clearInterval(interval);
        this.disconnectTimers.delete(playerId);
        delete room.reconnectTimers[playerId];

        // If player failed to reconnect within 30s
        if (!playerSeat.isConnected) {
          playerSeat.missedTurns++;
          if (playerSeat.missedTurns >= 2) {
            playerSeat.isBot = true;
            playerSeat.name = `${playerSeat.name} (Bot)`;
          }
        }
        this.broadcastRoom(room.roomId);
      } else {
        room.reconnectTimers[playerId]--;
        this.broadcastRoom(room.roomId);
      }
    }, 1000);

    this.disconnectTimers.set(playerId, interval);
  }

  /**
   * Broadcasts sanitized state to all clients in the room:
   * Each player only sees their own hand (other players' hands show card counts, preserving privacy).
   */
  public broadcastRoom(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    // Send personalized room state to each connected socket in room
    for (const seat of room.seats) {
      if (seat && !seat.isBot && seat.isConnected) {
        const session = this.sessions.get(seat.id);
        if (session && session.socketId) {
          const clientHand = room.playerHands[seat.id] || [];
          const sanitizedState: RoomState = {
            ...room,
            playerHands: {
              [seat.id]: clientHand,
            },
          };
          this.io.to(session.socketId).emit('room:state', sanitizedState);
        }
      }
    }

    // Also broadcast general room state to the room channel for observers
    this.io.to(`room:${code}`).emit('room:updated', {
      roomId: room.roomId,
      phase: room.phase,
      roundNumber: room.roundNumber,
      turnSeat: room.turnSeat,
      dealerSeat: room.dealerSeat,
      seats: room.seats,
      calls: room.calls,
      tricksWon: room.tricksWon,
      scores: room.scores,
      currentTrick: room.currentTrick,
      trickLeaderSeat: room.trickLeaderSeat,
      reconnectTimers: room.reconnectTimers,
      targetScore: room.targetScore,
      history: room.history,
      redealingNotice: room.redealingNotice,
      lastTrickWinnerSeat: room.lastTrickWinnerSeat,
    });
  }

  public registerSocketForPlayer(socketId: string, playerId: string): void {
    this.socketToPlayer.set(socketId, playerId);
    const session = this.sessions.get(playerId);
    if (session) {
      session.socketId = socketId;
    }
  }
}
