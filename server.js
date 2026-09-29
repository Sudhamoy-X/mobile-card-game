// server.ts
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// src/game/rules.ts
var SUITS = ["S", "H", "D", "C"];
var RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
var RANK_VALUES = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  "J": 11,
  "Q": 12,
  "K": 13,
  "A": 14
};
var TRUMP_SUIT = "S";
var BUMPER_CALL = 8;
var MIN_TOTAL_NORMAL_CALL = 9;
function validateDealDismissal(hands) {
  for (let seat = 0; seat < hands.length; seat++) {
    const hand = hands[seat];
    const hasSpade = hand.some((c) => c.suit === TRUMP_SUIT);
    if (!hasSpade) {
      return {
        dismissed: true,
        reason: "NO_SPADES",
        playerSeat: seat,
        message: `Round Dismissed: Seat ${seat + 1} has NO Spades. Required Spades condition not satisfied.`
      };
    }
    const hasHonor = hand.some((c) => ["J", "Q", "K", "A"].includes(c.rank));
    if (!hasHonor) {
      return {
        dismissed: true,
        reason: "NO_HONORS",
        playerSeat: seat,
        message: `Round Dismissed: Seat ${seat + 1} has NO J/Q/K/A honor cards. Required Honor condition not satisfied.`
      };
    }
  }
  return { dismissed: false };
}
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        value: RANK_VALUES[rank]
      });
    }
  }
  return deck;
}
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function sortHand(hand) {
  const suitOrder = { S: 0, H: 1, C: 2, D: 3 };
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return b.value - a.value;
  });
}
function dealCards() {
  const deck = shuffleDeck(createDeck());
  const hands = [[], [], [], []];
  for (let i = 0; i < 52; i++) {
    hands[i % 4].push(deck[i]);
  }
  return hands.map(sortHand);
}
function isCardPlayable(card, hand, currentTrick) {
  if (!hand.some((c) => c.id === card.id)) return false;
  if (currentTrick.length === 0) return true;
  const leadSuit = currentTrick[0].card.suit;
  const hasLeadSuit = hand.some((c) => c.suit === leadSuit);
  if (hasLeadSuit) {
    return card.suit === leadSuit;
  }
  return true;
}
function determineTrickWinner(trick) {
  if (trick.length === 0) {
    throw new Error("Cannot evaluate empty trick");
  }
  const leadSuit = trick[0].card.suit;
  const spadesPlayed = trick.filter((p) => p.card.suit === TRUMP_SUIT);
  if (spadesPlayed.length > 0) {
    return spadesPlayed.reduce((best, cur) => cur.card.value > best.card.value ? cur : best);
  }
  const leadSuitPlayed = trick.filter((p) => p.card.suit === leadSuit);
  return leadSuitPlayed.reduce((best, cur) => cur.card.value > best.card.value ? cur : best);
}
function calculatePlayerRoundScore(call, tricksWon) {
  if (call === null) return 0;
  if (call === BUMPER_CALL) {
    return tricksWon >= 8 ? 160 : -80;
  }
  if (tricksWon >= call) {
    const extra = tricksWon - call;
    return call * 10 + extra;
  } else {
    return -(call * 10);
  }
}
function validateTotalCalls(calls) {
  let combinedTotal = 0;
  for (const c of calls) {
    if (c !== null) {
      combinedTotal += c;
    }
  }
  return {
    valid: combinedTotal >= MIN_TOTAL_NORMAL_CALL,
    totalNormal: combinedTotal
  };
}

// src/game/botLogic.ts
function calculateBotCall(hand) {
  let estimatedTricks = 0;
  const suitCounts = { S: 0, H: 0, D: 0, C: 0 };
  const suitCards = { S: [], H: [], D: [], C: [] };
  for (const card of hand) {
    suitCounts[card.suit]++;
    suitCards[card.suit].push(card);
  }
  for (const card of hand) {
    if (card.rank === "A") {
      estimatedTricks += 1;
    } else if (card.rank === "K" && suitCounts[card.suit] >= 2) {
      estimatedTricks += 0.7;
    } else if (card.rank === "Q" && suitCounts[card.suit] >= 3) {
      estimatedTricks += 0.4;
    }
  }
  if (suitCounts.S >= 4) {
    estimatedTricks += (suitCounts.S - 3) * 0.5;
  }
  let call = Math.round(estimatedTricks);
  if (call < 2) call = 2;
  if (call > 6) call = 6;
  return call;
}
function chooseBotCard(hand, currentTrick) {
  const legalCards = hand.filter((c) => isCardPlayable(c, hand, currentTrick));
  if (legalCards.length === 0) {
    return hand[0];
  }
  if (currentTrick.length === 0) {
    const nonTrumpAces = legalCards.filter((c) => c.suit !== TRUMP_SUIT && c.rank === "A");
    if (nonTrumpAces.length > 0) {
      return nonTrumpAces[0];
    }
    const nonTrumpCards = legalCards.filter((c) => c.suit !== TRUMP_SUIT);
    if (nonTrumpCards.length > 0) {
      return nonTrumpCards.reduce((lowest, c) => c.value < lowest.value ? c : lowest);
    }
    return legalCards.reduce((lowest, c) => c.value < lowest.value ? c : lowest);
  }
  const currentBest = determineTrickWinner(currentTrick);
  const leadSuit = currentTrick[0].card.suit;
  const winningCards = [];
  for (const card of legalCards) {
    const testTrick = [...currentTrick, { seatIndex: 99, playerId: "bot", card }];
    const testWinner = determineTrickWinner(testTrick);
    if (testWinner.seatIndex === 99) {
      winningCards.push(card);
    }
  }
  if (winningCards.length > 0) {
    return winningCards.reduce((minWin, c) => c.value < minWin.value ? c : minWin);
  } else {
    const leadSuitCards = legalCards.filter((c) => c.suit === leadSuit);
    if (leadSuitCards.length > 0) {
      return leadSuitCards.reduce((lowest, c) => c.value < lowest.value ? c : lowest);
    }
    const nonTrumpLegal = legalCards.filter((c) => c.suit !== TRUMP_SUIT);
    if (nonTrumpLegal.length > 0) {
      return nonTrumpLegal.reduce((lowest, c) => c.value < lowest.value ? c : lowest);
    }
    return legalCards.reduce((lowest, c) => c.value < lowest.value ? c : lowest);
  }
}

// server/roomManager.ts
var RoomManager = class {
  constructor(io2) {
    this.rooms = /* @__PURE__ */ new Map();
    this.sessions = /* @__PURE__ */ new Map();
    // playerId -> PlayerSession
    this.socketToPlayer = /* @__PURE__ */ new Map();
    // socketId -> playerId
    this.disconnectTimers = /* @__PURE__ */ new Map();
    this.io = io2;
  }
  /**
   * Generates unique 4-digit room code e.g. "4829"
   */
  generateRoomCode() {
    let code = "";
    do {
      code = Math.floor(1e3 + Math.random() * 9e3).toString();
    } while (this.rooms.has(code));
    return code;
  }
  createRoom(hostId, hostName, hostAvatar, targetScore = 300) {
    const code = this.generateRoomCode();
    const hostPlayer = {
      id: hostId,
      name: hostName,
      avatar: hostAvatar,
      isBot: false,
      seatIndex: 0,
      isConnected: true,
      missedTurns: 0
    };
    const roomState = {
      roomId: code,
      hostId,
      targetScore,
      phase: "IDLE",
      roundNumber: 1,
      dealerSeat: 0,
      turnSeat: 1,
      seats: [hostPlayer, null, null, null],
      playerHands: {
        [hostId]: []
      },
      calls: {
        [hostId]: null
      },
      tricksWon: {
        [hostId]: 0
      },
      scores: {
        [hostId]: 0
      },
      currentTrick: [],
      trickLeaderSeat: 1,
      reconnectTimers: {},
      history: [],
      redealingNotice: null,
      lastTrickWinnerSeat: null
    };
    this.rooms.set(code, roomState);
    this.sessions.set(hostId, {
      socketId: null,
      playerId: hostId,
      name: hostName,
      avatar: hostAvatar,
      roomCode: code,
      seatIndex: 0
    });
    return roomState;
  }
  getRoom(code) {
    return this.rooms.get(code);
  }
  joinRoom(code, playerId, name, avatar) {
    const room = this.rooms.get(code);
    if (!room) {
      return { success: false, error: "Room not found" };
    }
    const existingSeat = room.seats.findIndex((s) => s && s.id === playerId);
    if (existingSeat !== -1) {
      const player = room.seats[existingSeat];
      player.isConnected = true;
      player.name = name || player.name;
      delete room.reconnectTimers[playerId];
      if (this.disconnectTimers.has(playerId)) {
        clearInterval(this.disconnectTimers.get(playerId));
        this.disconnectTimers.delete(playerId);
      }
      this.sessions.set(playerId, {
        socketId: null,
        playerId,
        name: player.name,
        avatar: player.avatar,
        roomCode: code,
        seatIndex: existingSeat
      });
      return { success: true, room };
    }
    if (room.phase !== "IDLE") {
      return { success: false, error: "Game has already started in this room" };
    }
    const emptySeatIndex = room.seats.findIndex((s) => s === null);
    if (emptySeatIndex === -1) {
      return { success: false, error: "Room is full (all 4 seats taken)" };
    }
    const newPlayer = {
      id: playerId,
      name,
      avatar,
      isBot: false,
      seatIndex: emptySeatIndex,
      isConnected: true,
      missedTurns: 0
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
      seatIndex: emptySeatIndex
    });
    return { success: true, room };
  }
  addBot(code, requesterId) {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== requesterId || room.phase !== "IDLE") return false;
    const emptySeatIndex = room.seats.findIndex((s) => s === null);
    if (emptySeatIndex === -1) return false;
    const botNumber = emptySeatIndex + 1;
    const botId = `bot-${code}-${emptySeatIndex}`;
    const botPlayer = {
      id: botId,
      name: `Bot ${botNumber}`,
      avatar: `bot-${emptySeatIndex}`,
      isBot: true,
      seatIndex: emptySeatIndex,
      isConnected: true,
      missedTurns: 0
    };
    room.seats[emptySeatIndex] = botPlayer;
    room.playerHands[botId] = [];
    room.calls[botId] = null;
    room.tricksWon[botId] = 0;
    room.scores[botId] = 0;
    this.broadcastRoom(code);
    return true;
  }
  removeBot(code, requesterId, seatIndex) {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== requesterId || room.phase !== "IDLE") return false;
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
  startGame(code, requesterId) {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== requesterId || room.phase !== "IDLE") return false;
    const allSeatsFilled = room.seats.every((s) => s !== null);
    if (!allSeatsFilled) return false;
    this.startRound(room);
    return true;
  }
  startRound(room) {
    room.phase = "SHUFFLING";
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
    setTimeout(() => {
      const hands = dealCards();
      for (let i = 0; i < 4; i++) {
        const player = room.seats[i];
        room.playerHands[player.id] = hands[i];
      }
      room.phase = "HAND_SETTLING";
      this.broadcastRoom(room.roomId);
      const allHands = [hands[0], hands[1], hands[2], hands[3]];
      const dismissal = validateDealDismissal(allHands);
      if (dismissal.dismissed) {
        room.phase = "DISMISSED";
        room.dismissalInfo = {
          reason: dismissal.reason,
          message: dismissal.message,
          playerSeat: dismissal.playerSeat
        };
        this.broadcastRoom(room.roomId);
        return;
      }
      setTimeout(() => {
        if (room.phase !== "HAND_SETTLING") return;
        room.phase = "CALLING";
        this.broadcastRoom(room.roomId);
        const botSeats = room.seats.filter((s) => s && s.isBot);
        botSeats.forEach((bot, index) => {
          setTimeout(() => {
            if (room.phase === "CALLING" && bot && room.calls[bot.id] === null) {
              room.calls[bot.id] = calculateBotCall(room.playerHands[bot.id]);
              this.broadcastRoom(room.roomId);
              this.checkAllCallsComplete(room);
            }
          }, 1e3 + index * 800);
        });
      }, 2600);
    }, 3200);
  }
  redealDismissed(code, requesterId) {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== requesterId || room.phase !== "DISMISSED") return false;
    this.startRound(room);
    return true;
  }
  makeCall(code, playerId, callValue) {
    const room = this.rooms.get(code);
    if (!room || room.phase !== "CALLING") return false;
    const seat = room.seats.find((s) => s && s.id === playerId);
    if (!seat) return false;
    room.calls[playerId] = callValue;
    this.broadcastRoom(code);
    this.checkAllCallsComplete(room);
    return true;
  }
  checkAllCallsComplete(room) {
    const allHaveCalled = room.seats.every((s) => s && room.calls[s.id] !== null);
    if (!allHaveCalled) return;
    const callsList = room.seats.map((s) => room.calls[s.id]);
    const validation = validateTotalCalls(callsList);
    if (!validation.valid) {
      room.redealingNotice = `Total normal call is ${validation.totalNormal} (Min 9 required). Redealing round...`;
      this.broadcastRoom(room.roomId);
      setTimeout(() => {
        this.startRound(room);
      }, 2500);
      return;
    }
    const startingSeat = (room.dealerSeat + 1) % 4;
    room.turnSeat = startingSeat;
    room.trickLeaderSeat = startingSeat;
    room.phase = "PLAYING";
    this.broadcastRoom(room.roomId);
    this.checkTurnAction(room);
  }
  playCard(code, playerId, card) {
    const room = this.rooms.get(code);
    if (!room || room.phase !== "PLAYING") return false;
    const currentSeat = room.seats[room.turnSeat];
    if (!currentSeat || currentSeat.id !== playerId) return false;
    const hand = room.playerHands[playerId] || [];
    if (!isCardPlayable(card, hand, room.currentTrick)) return false;
    room.playerHands[playerId] = hand.filter((c) => c.id !== card.id);
    const playedCard = {
      seatIndex: currentSeat.seatIndex,
      playerId,
      card
    };
    room.currentTrick.push(playedCard);
    currentSeat.missedTurns = 0;
    this.advanceTrickPlay(room);
    return true;
  }
  advanceTrickPlay(room) {
    if (room.currentTrick.length === 4) {
      room.phase = "TRICK_RESOLVING";
      const winner = determineTrickWinner(room.currentTrick);
      room.lastTrickWinnerSeat = winner.seatIndex;
      room.tricksWon[winner.playerId] = (room.tricksWon[winner.playerId] || 0) + 1;
      this.broadcastRoom(room.roomId);
      setTimeout(() => {
        room.currentTrick = [];
        room.lastTrickWinnerSeat = null;
        const anySeat = room.seats[0];
        const remaining = room.playerHands[anySeat.id]?.length || 0;
        if (remaining === 0) {
          this.finishRound(room);
        } else {
          room.trickLeaderSeat = winner.seatIndex;
          room.turnSeat = winner.seatIndex;
          room.phase = "PLAYING";
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
  checkTurnAction(room) {
    if (room.phase !== "PLAYING") return;
    const currentSeat = room.seats[room.turnSeat];
    if (!currentSeat) return;
    if (currentSeat.isBot) {
      setTimeout(() => {
        if (room.phase !== "PLAYING" || room.turnSeat !== currentSeat.seatIndex) return;
        const hand = room.playerHands[currentSeat.id] || [];
        if (hand.length === 0) return;
        const botCard = chooseBotCard(hand, room.currentTrick);
        this.playCard(room.roomId, currentSeat.id, botCard);
      }, 700);
      return;
    }
    if (!currentSeat.isConnected) {
      currentSeat.missedTurns++;
      if (currentSeat.missedTurns >= 2) {
        currentSeat.isBot = true;
        currentSeat.name = `${currentSeat.name} (Bot)`;
        this.broadcastRoom(room.roomId);
      }
      setTimeout(() => {
        if (room.phase !== "PLAYING" || room.turnSeat !== currentSeat.seatIndex) return;
        const hand = room.playerHands[currentSeat.id] || [];
        if (hand.length === 0) return;
        const fallbackCard = chooseBotCard(hand, room.currentTrick);
        this.playCard(room.roomId, currentSeat.id, fallbackCard);
      }, 1e3);
    }
  }
  finishRound(room) {
    room.phase = "ROUND_SUMMARY";
    const roundScores = {};
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
      totalScores: { ...room.scores }
    });
    const reachedTarget = Object.values(room.scores).some((s) => s >= room.targetScore);
    if (reachedTarget) {
      room.phase = "GAME_OVER";
    }
    this.broadcastRoom(room.roomId);
  }
  nextRound(code, requesterId) {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== requesterId || room.phase !== "ROUND_SUMMARY") return false;
    room.roundNumber++;
    room.dealerSeat = (room.dealerSeat + 1) % 4;
    this.startRound(room);
    return true;
  }
  restartGame(code, requesterId) {
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
  handleSocketConnect(socket, playerId, name, avatar, roomCode) {
    this.socketToPlayer.set(socket.id, playerId);
    if (roomCode && this.rooms.has(roomCode)) {
      const room = this.rooms.get(roomCode);
      const seat = room.seats.find((s) => s && s.id === playerId);
      if (seat) {
        seat.isConnected = true;
        delete room.reconnectTimers[playerId];
        if (this.disconnectTimers.has(playerId)) {
          clearInterval(this.disconnectTimers.get(playerId));
          this.disconnectTimers.delete(playerId);
        }
        socket.join(`room:${roomCode}`);
        this.broadcastRoom(roomCode);
      }
    }
  }
  handleSocketDisconnect(socket) {
    const playerId = this.socketToPlayer.get(socket.id);
    this.socketToPlayer.delete(socket.id);
    if (!playerId) return;
    const session = this.sessions.get(playerId);
    if (!session) return;
    const room = this.rooms.get(session.roomCode);
    if (!room) return;
    const playerSeat = room.seats.find((s) => s && s.id === playerId);
    if (!playerSeat) return;
    playerSeat.isConnected = false;
    room.reconnectTimers[playerId] = 30;
    this.broadcastRoom(room.roomId);
    if (this.disconnectTimers.has(playerId)) {
      clearInterval(this.disconnectTimers.get(playerId));
    }
    const interval = setInterval(() => {
      if (!room.reconnectTimers[playerId] || room.reconnectTimers[playerId] <= 1) {
        clearInterval(interval);
        this.disconnectTimers.delete(playerId);
        delete room.reconnectTimers[playerId];
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
    }, 1e3);
    this.disconnectTimers.set(playerId, interval);
  }
  /**
   * Broadcasts sanitized state to all clients in the room:
   * Each player only sees their own hand (other players' hands show card counts, preserving privacy).
   */
  broadcastRoom(code) {
    const room = this.rooms.get(code);
    if (!room) return;
    for (const seat of room.seats) {
      if (seat && !seat.isBot && seat.isConnected) {
        const session = this.sessions.get(seat.id);
        if (session && session.socketId) {
          const clientHand = room.playerHands[seat.id] || [];
          const sanitizedState = {
            ...room,
            playerHands: {
              [seat.id]: clientHand
            }
          };
          this.io.to(session.socketId).emit("room:state", sanitizedState);
        }
      }
    }
    this.io.to(`room:${code}`).emit("room:updated", {
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
      lastTrickWinnerSeat: room.lastTrickWinnerSeat
    });
  }
  registerSocketForPlayer(socketId, playerId) {
    this.socketToPlayer.set(socketId, playerId);
    const session = this.sessions.get(playerId);
    if (session) {
      session.socketId = socketId;
    }
  }
};

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var server = http.createServer(app);
var io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
var roomManager = new RoomManager(io);
app.use(express.json());
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/rooms/create", (req, res) => {
  const { hostId, hostName, hostAvatar, targetScore } = req.body;
  if (!hostId || !hostName) {
    return res.status(400).json({ error: "hostId and hostName are required" });
  }
  const room = roomManager.createRoom(
    hostId,
    hostName,
    hostAvatar || "user",
    targetScore ? Number(targetScore) : 300
  );
  return res.status(201).json({ room });
});
app.post("/api/rooms/join", (req, res) => {
  const { code, playerId, name, avatar } = req.body;
  if (!code || !playerId || !name) {
    return res.status(400).json({ error: "code, playerId, and name are required" });
  }
  const result = roomManager.joinRoom(code, playerId, name, avatar || "user");
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(200).json({ room: result.room });
});
app.get("/api/rooms/:code", (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  return res.status(200).json({ room });
});
io.on("connection", (socket) => {
  socket.on("player:register", ({ playerId, name, avatar, roomCode }) => {
    roomManager.registerSocketForPlayer(socket.id, playerId);
    if (roomCode) {
      roomManager.handleSocketConnect(socket, playerId, name, avatar, roomCode);
    }
  });
  socket.on("room:join_socket", ({ roomCode, playerId, name, avatar }) => {
    socket.join(`room:${roomCode}`);
    roomManager.registerSocketForPlayer(socket.id, playerId);
    roomManager.handleSocketConnect(socket, playerId, name, avatar, roomCode);
  });
  socket.on("room:add_bot", ({ roomCode, requesterId }) => {
    roomManager.addBot(roomCode, requesterId);
  });
  socket.on("room:remove_bot", ({ roomCode, requesterId, seatIndex }) => {
    roomManager.removeBot(roomCode, requesterId, seatIndex);
  });
  socket.on("room:start", ({ roomCode, requesterId }) => {
    roomManager.startGame(roomCode, requesterId);
  });
  socket.on("game:make_call", ({ roomCode, playerId, callValue }) => {
    roomManager.makeCall(roomCode, playerId, callValue);
  });
  socket.on("game:play_card", ({ roomCode, playerId, card }) => {
    roomManager.playCard(roomCode, playerId, card);
  });
  socket.on("game:next_round", ({ roomCode, requesterId }) => {
    roomManager.nextRound(roomCode, requesterId);
  });
  socket.on("game:restart", ({ roomCode, requesterId }) => {
    roomManager.restartGame(roomCode, requesterId);
  });
  socket.on("game:redeal_dismissed", ({ roomCode, requesterId }) => {
    roomManager.redealDismissed(roomCode, requesterId);
  });
  socket.on("disconnect", () => {
    roomManager.handleSocketDisconnect(socket);
  });
});
var distPath = path.resolve(__dirname, "dist");
var hasDist = fs.existsSync(distPath);
var isProduction = process.env.NODE_ENV === "production" || hasDist;
async function startServer() {
  if (isProduction && hasDist) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }
  const PORT = Number(process.env.PORT) || 3e3;
  const HOST = "0.0.0.0";
  server.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
