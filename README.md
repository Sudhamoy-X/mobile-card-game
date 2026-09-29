# Mobile Card Game 2.0

A high-performance, authoritative 4-player Spades / Call Break card game built with **Obsidian Gold** luxury aesthetic. Features 100% offline local play against intelligent bots, real-time multiplayer with friends over Socket.IO, 4-digit room codes, 30-second reconnection handling, and native Android packaging with GitHub Actions CI.

---

## 🎮 Game Rules & Specifications

- **Players:** Exactly 4 players.
- **Deck:** Standard 52-card deck, dealt 13 cards per player.
- **Ranking:** `A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2`.
- **Trump:** Spades (`♠`) are always the permanent Trump suit.
- **Tricks:** 13 tricks per round.
- **Trick Rules:**
  - Players must follow the leading suit if they hold any cards of that suit.
  - If void in the leading suit, players may play any card (trump or discard).
  - The highest card of the leading suit wins unless a Spade is played.
  - If Spades are played, the highest Spade wins.
  - The trick winner leads the subsequent trick.

### Calls & Bidding
- **Normal Calls:** 1, 2, 3, 4, 5, 6, 7.
- **Minimum Total Normal Call:** 9. If the sum of normal calls across all 4 players is less than 9, the cards are automatically redealt and players re-bid.
- **Bumper Call:** 160.
  - Successful Bumper (wins 13 tricks): **+160 points**.
  - Failed Bumper: **-80 points**.
  - Bumper does not use normal call × 10 scoring.

### Normal Scoring
- Exact call achieved: `call × 10`.
- Each trick won above the call: `+1 point` per trick (e.g., call 3, win 6 = `+33 points`).
- Failed call: `-(call × 10)` (e.g., call 3, win 2 = `-30 points`).

### Targets
- **200**, **300** (default), or **500** points.
- Game ends after a completed round when any player reaches or exceeds the selected target score.

---

## 🕹️ Game Modes

### 1. Local Play (100% Offline)
- 1 Human + 3 autonomous bots.
- No network connection required.
- Game state automatically persists in `localStorage` for **CONTINUE GAME**.

### 2. With Friends (Online Multiplayer)
- Real-time Socket.IO synchronization.
- **Create Room:** Generates unique 4-digit code (e.g., `4829`), selects target score, and provides seat management.
- **Join Room:** Enter 4-digit room code to take an available seat.
- **4 Seats:** Host can manually add or remove bots in empty seats. Valid configurations:
  - 4 humans
  - 3 humans + 1 bot
  - 2 humans + 2 bots
  - 1 human + 3 bots
- Game begins once all 4 seats are occupied.

---

## ⚡ Server Architecture & Reconnection

- **Authoritative Server:** Express + Socket.IO in TypeScript. Server validates all calls, card plays, turns, trick outcomes, and scores.
- **Reconnection Handling:**
  - Preserves disconnected player's seat, hand, call, tricks, and total score.
  - Broadcasts a synchronized 30-second reconnection timer.
  - When the player returns, their state is restored immediately.
  - If a player misses 2 required turns after failing to reconnect, control is replaced by an autonomous bot without resetting seat or state.

### REST Endpoints
- `GET /health` - Healthcheck endpoint.
- `POST /api/rooms/create` - Create multiplayer room.
- `POST /api/rooms/join` - Join room with 4-digit code.
- `GET /api/rooms/:code` - Retrieve room details.

---

## 📁 Project Structure

```
├── android/                 # Native Android project (Gradle wrapper, JDK 17)
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/main/java/com/mobilecardgame/MainActivity.kt
│   ├── build.gradle
│   ├── gradlew
│   └── settings.gradle
├── server/                  # Server engine & room manager
│   ├── gameEngine.ts
│   └── roomManager.ts
├── src/                     # Frontend React + TypeScript application
│   ├── components/
│   │   ├── CardView.tsx
│   │   ├── PlayerPanel.tsx
│   │   ├── TrickArea.tsx
│   │   ├── CallModal.tsx
│   │   ├── CallHistoryOverlay.tsx
│   │   ├── RoundSummaryModal.tsx
│   │   ├── WinnerModal.tsx
│   │   ├── LobbyModal.tsx
│   │   ├── HomeScreen.tsx
│   │   └── GameScreen.tsx
│   ├── game/                # Game rules & bot AI engine
│   │   ├── rules.ts
│   │   ├── botLogic.ts
│   │   └── localGameManager.ts
│   ├── utils/
│   │   ├── audio.ts         # Web Audio API procedural synthesis & haptics
│   │   └── auth.ts          # Profile and auth management
│   └── App.tsx
├── .github/workflows/       # GitHub Actions workflow
│   └── android.yml
├── server.ts                # Express + Socket.IO server entry point
└── package.json
```

---

## 🛠️ Build & Development

### 1. Web & Server
```bash
# Run development server (serves on http://0.0.0.0:3000)
npm run dev

# Build production bundle
npm run build

# Start production server
npm start
```

### 2. Android APK Build
```bash
cd android
./gradlew assembleDebug
```
The resulting APK is generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🌟 Obsidian Gold Theme
- Obsidian black canvas (`#090A0F`)
- Charcoal structural surfaces (`#12151D`, `#161924`)
- Metallic Gold foil accents (`#D4AF37`, `#F5CF68`)
- Warm white card faces & typography (`#F5F5F0`)
- Realistic cards with 3D depth and subtle playability highlights
- Light/Dark theme toggle support
