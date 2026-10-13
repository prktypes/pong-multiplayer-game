# 🏓 Pong Multiplayer

A real-time multiplayer Pong game built with **WebSockets**, **React**, and **Node.js**. Two players connect via room codes, compete on a shared canvas, and the first to 5 points wins.

![Pong Demo](https://img.shields.io/badge/Phase-3%20Complete-brightgreen.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Nodes](https://img.shields.io/badge/Node.js-v20.15%2B-green.svg)
![React](https://img.shields.io/badge/React-v18-blue.svg)

---

## 🎮 Quick Overview

Play Pong with a friend! Create a room, share the 4-letter code, and join from another browser window. Use **W/S** or **Arrow keys** to move your paddle. The ball physics are synchronized in real-time across both players via Socket.IO.

- **Room-based matchmaking** — 4-letter codes (e.g., `ABCD`)
- **60 FPS synchronized gameplay** — Server ticks every 16ms
- **Physics engine** — Ball movement, wall bounces, paddle collisions, scoring
- **State machine** — idle → waiting → ready → playing → gameover
- **No database required** — In-memory room storage for fast, temporary matches

---

## 🚀 Live Demo

1. Open **Browser 1** at `http://localhost:5174`
2. Click **"Create Room"** — copy the code (e.g., `XPQZ`)
3. Open **Browser 2** at `http://localhost:5174`
4. Click **"Join Room"**, paste `XPQZ`
5. Both see **"Game Ready!"** — click **Start Game** and play!

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, HTML5 Canvas, Socket.IO Client, CSS3 |
| **Backend** | Node.js, Express, Socket.IO, CORS |
| **Real-time** | WebSockets (Socket.IO) |
| **Rendering** | Canvas 2D API |

---

## 📁 Project Structure

```
pong/
├── client/                    # React Frontend (Vite)
│   ├── src/
│   │   ├── App.jsx          # Game state machine & routing
│   │   ├── socket.js        # Socket.IO client setup
│   │   ├── constants.js     # Physics constants
│   │   ├── index.css        # Styling with "Press Start 2P" font
│   │   ├── components/
│   │   │   ├── Lobby.jsx            # [idle] Create/Join UI
│   │   │   ├── WaitingRoom.jsx      # [waiting] Opponent connection
│   │   │   ├── GameCanvas.jsx       # [playing] HTML5 Canvas rendering
│   │   │   ├── Scoreboard.jsx       # Score display overlay
│   │   │   └── GameOver.jsx         # [gameover] Winner announcement
│   │   └── hooks/
│   │       └── useGameInput.js     # W/S/Arrow key listeners
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── server/                    # Node.js Backend
│   ├── index.js             # Express + HTTP + Socket.IO setup
│   ├── package.json
│   ├── game/
│   │   ├── GameEngine.js      # Physics: tick, collisions, scoring
│   │   ├── RoomManager.js     # In-memory room storage & lookup
│   │   └── constants.js       # Game tuning parameters
│   └── socket/
│       ├── index.js           # Socket.IO connection handler
│       ├── roomHandlers.js    # createRoom, joinRoom, disconnect
│       └── gameHandlers.js    # startGame, paddleMove, game loop
│
├── ARCHITECTURE.md          # Detailed architecture & data flow guide
├── PROJECT_DOCUMENTATION.md # Complete project overview
└── README.md                # ← This file
```

---

## 🏗️ Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│                 (Client - React/Canvas)                      │
│                                                              │
│  App.jsx (State Machine)                                      │
│  ├─ Lobby.jsx          [idle state]                          │
│  ├─ WaitingRoom.jsx    [waiting state]                      │
│  ├─ GameCanvas.jsx     [playing/gameover states]            │
│  └─ useGameInput.js    [W/S/Arrow key listeners]            │
│                                                              │
└─────────────────────↕ Socket.IO Events──────────────────────┘
                      (Bidirectional WebSockets)
┌─────────────────────────────────────────────────────────────┐
│                    COMMUNICATION LAYER                       │
│                 (Socket.IO Server)                           │
│                                                              │
│  socket/index.js          [Connection handler]               │
│  ├─ roomHandlers.js       [Room CRUD operations]             │
│  └─ gameHandlers.js       [Game loop & physics updates]      │
│                                                              │
└─────────────────────↕ In-Memory──────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      LOGIC LAYER                             │
│                 (Node.js Backend)                            │
│                                                              │
│  game/GameEngine.js       [Physics & collision detection]   │
│  game/RoomManager.js      [Room lifecycle management]        │
│  game/constants.js        [Game parameters & speeds]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Input → Server → Screen

```
Player presses 'W'
      ↓
useGameInput hook detects key
      ↓
socket.emit('paddleMove', {direction: 'up'})
      ↓ [Over network ~instant]
      ↓
Server receives in gameHandlers.js
      ↓
movePaddle(gameState, playerNumber, 'up')
      ↓
gameState.paddles[1].y -= PADDLE_SPEED
      ↓ [Next game tick - 16ms later]
      ↓
tick(gameState) executes
  • Updates ball physics
  • Checks paddle collision with new paddle position
  • Updates scores if needed
      ↓
io.to(roomCode).emit('gameState', {ball, paddles, scores})
      ↓ [Over network ~instant]
      ↓
Client receives in App.jsx
      ↓
setPongState(state) // React state update
      ↓
GameCanvas component re-renders
      ↓
Player sees updated paddle & ball on screen
```

**Total latency:** ~16ms (plus network round-trip)

---

## 🎯 Core Gameplay Loop

### Server-Side (Every 16ms / ~60 FPS)

```javascript
setInterval(() => {
  const room = roomManager.getRoom(roomCode);
  if (!room?.gameState) return;

  const { gameState, scored } = tick(room.gameState);

  if (scored) {
    io.to(roomCode).emit('scored', { scoredBy, scores });
  }

  if (gameState.status === 'finished') {
    io.to(roomCode).emit('gameOver', { winner, scores });
    clearInterval(loopId);
    return;
  }

  io.to(roomCode).emit('gameState', {
    ball: gameState.ball,
    paddles: gameState.paddles,
    scores: gameState.scores
  });
}, 16);
```

### Client-Side (Event-Driven)

React listens for `gameState` events and re-renders the canvas ~60x/sec.

---

## 📡 Socket Events Reference

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `createRoom` | Client → Server | `{}` | Create new room, get code |
| `roomCreated` | Server → Client | `{roomCode, playerNumber}` | Room created successfully |
| `joinRoom` | Client → Server | `{code: 'XPQZ'}` | Join existing room |
| `roomJoined` | Server → Client | `{roomCode, playerNumber}` | Joined successfully |
| `roomReady` | Server → Both | `{roomCode, message}` | Both players connected |
| `startGame` | Client → Server | `{}` | Begin game, start loop |
| `paddleMove` | Client → Server | `{direction: 'up'\|'down'}` | Move paddle |
| `gameState` | Server → Both | `{ball, paddles, scores}` | Sent every ~16ms |
| `scored` | Server → Both | `{scoredBy, scores}` | Goal scored |
| `gameOver` | Server → Both | `{winner, scores}` | Game finished |
| `disconnect` | Server Event | N/A | Player left/connection lost |
| `opponentLeft` | Server → Remaining | `{message}` | Other player disconnected |

---

## 🚀 Development & Running

### Prerequisites

- **Node.js** v20.15+
- **npm** or **yarn**

### Installation

```bash
# Server
cd server
npm install

# Client
cd client
npm install
```

### Running Locally

**Terminal 1 - Start Server**

```bash
cd server
node index.js
# Output: Server running on http://localhost:3001
```

**Terminal 2 - Start Client Dev Server**

```bash
cd client
npm run dev
# Output: ✔ Vite v7.x ready in ~xxx ms
#         ➜ Local:   http://localhost:5174/
```

### How to Play

1. Open **Browser 1** at `http://localhost:5174`
2. Click **"Create Room"** — share the 4-letter code
3. Open **Browser 2** at `http://localhost:5174`
4. Click **"Join Room"**, paste the code
5. Both see **"Game Ready!"** — click **Start Game**
6. Press **W** or **ArrowUp** to move up, **S** or **ArrowDown** to move down
7. First to **5 points** wins! Click **"Play Again?"** for a new match.

---

## 🔧 Available Scripts

### Client (`client/package.json`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server at `localhost:5174` |
| `npm run build` | Build production bundle |
| `npm run lint` | Run ESLint |

### Server (`server/package.json`)

| Script | Description |
|--------|-------------|
| `node index.js` | Start Express + Socket.IO server |
| `npm run dev` | (If configured) Nodemon for auto-restart |

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| **W** / **ArrowUp** | Move paddle up |
| **S** / **ArrowDown** | Move paddle down |
| **Start Game** | Begin the match (both players) |
| **Play Again** | Restart after game over |

---

## 📦 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details (or create one if you don't have it yet).

---

## 🔄 Next Phase Ideas

- ✅ User accounts & persistent profiles
- ✅ Database (MongoDB) for room/leaderboard persistence
- ✅ Matchmaking queue (auto-pair waiting players)
- ✅ Replay system (record & playback matches)
- ✅ Sound effects (bounce, score, game over)
- ✅ Mobile touch controls
- ✅ Customizable paddles & colors
- ✅ Admin panel (monitor active games)

---

**Built with ❤️ using Node.js, React, Vite, and Socket.IO**

*For more details, see [ARCHITECTURE.md](./ARCHITECTURE.md) and [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md).*