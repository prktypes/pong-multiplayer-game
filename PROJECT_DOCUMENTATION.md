# PONG Multiplayer Game - Complete Architecture & Workflow

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Game Flow & State Transitions](#game-flow--state-transitions)
5. [Core Systems](#core-systems)
6. [Client-Server Communication](#client-server-communication)
7. [Real-Time Gameplay Loop](#real-time-gameplay-loop)
8. [Code Structure Walkthrough](#code-structure-walkthrough)
9. [Key Data Structures](#key-data-structures)
10. [Development & Running](#development--running)

---

## 📌 Project Overview

**What is this?**
A real-time multiplayer Pong game built with WebSockets. Two players connect via room codes, watch a shared game board in real-time, and compete with keyboard-controlled paddles.

**Key Features:**
- Room-based matchmaking with 4-letter codes (e.g., "ABCD")
- Real-time synchronized gameplay at 60 FPS
- Physics engine: ball movement, paddle collisions, scoring
- Keyboard input: W/ArrowUp to move up, S/ArrowDown to move down
- Win condition: First to 5 points wins
- Temporary in-memory room storage (no database for gameplay)

---

## 🏗️ Architecture

### High-Level Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (CLIENT)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React App (App.jsx)                     │   │
│  │  - Game state management (idle→waiting→ready→playing)  │   │ 
│  │  - Socket event listeners                            │   │
│  │  - Screen routing based on gameState                 │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         UI Components                                │   │
│  │  - Lobby (create/join room)                         │   │
│  │  - WaitingRoom (player #1 & #2 connected)           │   │
│  │  - GameCanvas (HTML5 canvas rendering)              │   │
│  │  - Scoreboard, GameOver                             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Hooks & Input                                │   │
│  │  - useGameInput: W/S/Arrow key listeners            │   │
│  │  - Emits 'paddleMove' on key press                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↕ Socket.IO                         │
└─────────────────────────────────────────────────────────────┘
                           
┌─────────────────────────────────────────────────────────────┐
│                   NODE.JS SERVER                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Socket.IO Server                        │   │
│  │  (index.js: Express + HTTP + Socket.IO setup)       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Room Management Handler                      │   │
│  │  (roomHandlers.js)                                   │   │
│  │  - createRoom: Generate 4-letter code               │   │
│  │  - joinRoom: Validate & add 2nd player              │   │
│  │  - disconnect: Clean up rooms                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Game Logic Handler                           │   │
│  │  (gameHandlers.js)                                   │   │
│  │  - startGame: Initialize game state                 │   │
│  │  - 60 FPS game loop: Physics tick every 16ms        │   │
│  │  - paddleMove: Update paddle position               │   │
│  │  - Broadcast gameState to both players              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Core Game Systems                            │   │
│  │  - RoomManager (in-memory Map of rooms)              │   │
│  │  - GameEngine (physics, collisions, scoring)         │   │
│  │  - Constants (canvas size, speeds, etc.)            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

**Frontend:**
- React 18 (UI framework)
- Vite (dev server & build tool)
- Socket.IO Client (WebSocket communication)
- HTML5 Canvas (game rendering)
- CSS3 (styling with "Press Start 2P" retro font)

**Backend:**
- Node.js (runtime)
- Express (HTTP server)
- Socket.IO (real-time bidirectional communication)
- CORS (cross-origin support during development)

**Storage:**
- In-Memory Map (temporary rooms, not persisted)

---

## 🎮 Game Flow & State Transitions

### Client State Machine
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  START                                                          │
│    ↓                                                            │
│  [idle]                                                         │
│    │ User clicks "Create Room" or enters code                  │
│    ↓                                                            │
│  [waiting]  ← Both players must reach this state               │
│    │                                                            │
│    │ (If 1 player: waiting for other)                          │
│    │ (If 2 players + roomReady signal from server)             │
│    ↓                                                            │
│  [ready]                                                        │
│    │ Player clicks "Start Game"                                │
│    ↓                                                            │
│  [playing]                                                      │
│    │ Real-time game running (60 FPS updates)                   │
│    │ (Or if opponent leaves → back to [waiting])               │
│    ↓                                                            │
│  [gameover]                                                     │
│    │ Player clicks "Play Again"                                │
│    ↓                                                            │
│  [playing]  (restart)                                          │
│    OR                                                           │
│  [idle]     (disconnect)                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Server Room State
```
Room Lifecycle:
  Created: { code: 'ABCD', players: [socket1], status: 'waiting' }
  Player 2 joins: { code: 'ABCD', players: [socket1, socket2], status: 'waiting' }
  Game starts: Add gameState object, status → 'playing'
  Scoring: gameState updated, 'scored' event emitted
  Game ends: status → 'finished'
  Players leave: Room deleted from memory
```

---

## 🎯 Core Systems

### 1. RoomManager (server/game/RoomManager.js)
**Purpose:** Manage temporary in-memory rooms

**Key Methods:**
- `generateCode()` - Creates random 4-letter code (e.g., "XPQZ")
- `createRoom(socketId)` - Creates new room, adds creator as player 1
- `joinRoom(code, socketId)` - Validates code, adds 2nd player
- `getRoom(code)` - Fetch room by code
- `getRoomBySocketId(socketId)` - Find which room a socket is in
- `removePlayer(socketId)` - Remove player, delete room if empty

**Data Structure:**
```javascript
rooms = Map {
  'ABCD' → {
    code: 'ABCD',
    players: ['socket_id_1', 'socket_id_2'],
    status: 'waiting' | 'playing' | 'finished',
    gameState: { ball, paddles, scores, ... },  // added when game starts
    createdAt: 1711270400000
  }
}
```

### 2. GameEngine (server/game/GameEngine.js)
**Purpose:** Physics simulation and collision detection

**Key Functions:**
- `createGameState()` - Initialize fresh game (ball at center, paddles centered, scores 0-0)
- `tick(gameState)` - Called every 16ms, returns { gameState, scored: null|1|2 }
- `movePaddle(gameState, playerNum, direction)` - Move paddle up/down
- `resetBall()` - Reset to center after scoring

**Physics Calculations:**
1. **Ball movement:** `x += vx`, `y += vy`
2. **Top/bottom wall bounce:** If y ≤ 0 or y ≥ height, reverse vy
3. **Paddle collision (P1 left):**
   - Check if ball overlaps paddle rectangle
   - Bounce ball right, apply speedup (1.05x)
   - Calculate angle based on hit position (top = steep up, bottom = steep down)
4. **Paddle collision (P2 right):** Same logic, reversed
5. **Out-of-bounds scoring:** Ball past left wall → P2 scores, Ball past right wall → P1 scores

**Constants:**
```javascript
CANVAS_WIDTH:   800
CANVAS_HEIGHT:  500
PADDLE_WIDTH:   12
PADDLE_HEIGHT:  80
PADDLE_SPEED:   6 pixels/tick
BALL_SIZE:      10
BALL_SPEED:     5 (initial)
BALL_MAX_SPEED: 12 (cap)
WINNING_SCORE:  5
TICK_RATE:      16.67ms (60 FPS)
```

### 3. Socket Event Flow

**Room Events (roomHandlers.js):**
```
Client                          Server
─────                          ──────

emit 'createRoom'
                    ──────────→ Generate code 'ABCD'
                                Create room
                                socket.join('ABCD')
                    ←────────── emit 'roomCreated'

emit 'joinRoom' {code: 'ABCD'}
                    ──────────→ Validate room exists
                                Add player 2
                                socket.join('ABCD')
                    ←────────── emit 'roomJoined'
                    ←────────── io.to('ABCD').emit 'roomReady'
                                (sent to BOTH players)

(Player leaves)
                    ──────────→ disconnect event
                                removePlayer()
                    ←────────── io.to('ABCD').emit 'opponentLeft'
                                (to remaining player)
```

**Game Events (gameHandlers.js):**
```
Client                          Server
─────                          ──────

emit 'startGame'
                    ──────────→ room.gameState = createGameState()
                                Start setInterval (16ms tick)
                                
                                [GAME LOOP RUNNING]

emit 'paddleMove' {direction: 'up'}
                    ──────────→ movePaddle(gameState, ...)
                                (updated in next tick)

(Every 16ms in game loop)
                                tick(gameState)
                                Collisions, scoring, ball physics
                    ←────────── emit 'gameState' to room
                                { ball, paddles, scores }

                    ←────────── emit 'scored' (if goal)
                                { scoredBy, scores }

                    ←────────── emit 'gameOver' (if winning score)
                                { winner, scores }
                                clearInterval (loop stops)
```

---

## 🔄 Client-Server Communication

### How WebSocket Events Work

**Socket.IO Pattern:**
```javascript
// Client sends
socket.emit('eventName', data);

// Server receives & sends back
socket.on('eventName', (data) => {
  io.to(roomCode).emit('replyEvent', responseData);
  // or
  socket.emit('replyEvent', responseData);
});

// Client receives
socket.on('replyEvent', (responseData) => {
  // Update local state
});
```

### Event Timeline for a Match

```
T=0s   Player 1 clicks "Create Room"
       Client: emit 'createRoom'
       Server: generate code 'XPQZ', socket.join('XPQZ')
       Server: emit 'roomCreated' with code & playerNumber
       Client: setGameState('waiting'), setRoomCode('XPQZ')
       UI: Show "Share code XPQZ with a friend"

T=3s   Player 2 enters code 'XPQZ' and clicks "Join"
       Client: emit 'joinRoom' { code: 'XPQZ' }
       Server: validate, add player 2, socket.join('XPQZ')
       Server: emit 'roomJoined' to player 2
       Server: io.to('XPQZ').emit 'roomReady' to BOTH
       Client (both): setGameState('ready')
       UI (both): Show "Game Ready! Player X. Start Game?"

T=5s   Both click "Start Game"
       Client: emit 'startGame'
       Server: gameState = createGameState()
              setInterval(() => {
                tick(gameState)
                io.to('XPQZ').emit 'gameState' { ball, paddles, scores }
              }, 16)

T=5-25s Gameplay
       Every ~16ms Server emits 'gameState'
       Client receives, updates pongState, redraws canvas
       
       Player presses W
       Client: emit 'paddleMove' { direction: 'up' }
       Server: movePaddle(...) → updates gameState
       Next tick: ball position reflects new paddle
       Next emit: both players see paddle moved

T=15s  Player 1 scores
       Server: (in tick) ball.x < 0 → scores[1]++
               emit 'scored' { scoredBy: 1, scores: {1: 1, 2: 0} }
               resetBall() → ball returns to center
       Client: setScores updated, next tick shows centered ball

T=45s  Player 1 reaches 5 points
       Server: (in tick) scores[1] === 5
               emit 'gameOver' { winner: 1, scores }
               clearInterval (loop stops)
       Client: setGameState('gameover'), setWinner(1)
       UI: Show "Player 1 Wins! 5-2" with "Play Again?" button

T=46s  Click "Play Again"
       Client: emit 'startGame'
       Server: (new game loop) gameState = createGameState()
               Repeat from T=5s
```

---

## ⚡ Real-Time Gameplay Loop

### Server-Side Game Loop (60 FPS)
```javascript
// Started when BOTH players click "Start Game"
const loopId = setInterval(() => {
  // 1. Get latest room (ensures we have fresh reference)
  const currentRoom = roomManager.getRoom(roomCode);
  
  // 2. Safety checks
  if (!currentRoom || !currentRoom.gameState) {
    clearInterval(loopId);
    return;
  }
  
  // 3. Physics tick
  const { gameState, scored } = tick(currentRoom.gameState);
  
  // 4. Check if someone scored
  if (scored) {
    io.to(roomCode).emit('scored', {
      scoredBy: scored,
      scores: gameState.scores
    });
  }
  
  // 5. Check if game is over
  if (gameState.status === 'finished') {
    io.to(roomCode).emit('gameOver', {
      winner: gameState.winner,
      scores: gameState.scores
    });
    clearInterval(loopId);
    return;
  }
  
  // 6. Broadcast current state to both players
  io.to(roomCode).emit('gameState', {
    ball: gameState.ball,
    paddles: gameState.paddles,
    scores: gameState.scores
  });
  
}, 16); // 16.67ms ≈ 60 FPS
```

### Client-Side Rendering Loop (Canvas)
```javascript
// React component receives gameState prop
useEffect(() => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  
  // Render current game state
  drawGame(ctx, gameState, playerNumber);
  
  // Re-run whenever gameState changes
  // (which happens ~60 times per second from server)
}, [gameState, playerNumber]);

// Drawing:
// 1. Clear canvas (black background)
// 2. Draw center line (dashed)
// 3. Draw player 1 paddle (left side, brighter if you're P1)
// 4. Draw player 2 paddle (right side, brighter if you're P2)
// 5. Draw ball (white square)
```

### Input Handling (Client-Side)
```javascript
// useGameInput hook runs while gameState === 'playing'
useEffect(() => {
  const keys = new Set();
  
  // Send paddle commands 60x per second
  const inputLoop = setInterval(() => {
    if (keys.has('w') || keys.has('arrowup')) {
      socket.emit('paddleMove', { direction: 'up' });
    }
    if (keys.has('s') || keys.has('arrowdown')) {
      socket.emit('paddleMove', { direction: 'down' });
    }
  }, 16);
  
  // Track which keys are held down
  window.addEventListener('keydown', (e) => {
    keys.add(e.key.toLowerCase());
  });
  
  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.toLowerCase());
  });
  
  return () => {
    clearInterval(inputLoop);
    // Remove listeners
  };
}, [isPlaying]);
```

---

## 📁 Code Structure Walkthrough

### Directory Layout
```
pong/
├── client/                          # React Frontend
│   ├── src/
│   │   ├── App.jsx                  # Main game component, state machine
│   │   ├── main.jsx                 # React entry point
│   │   ├── socket.js                # Socket.IO client setup
│   │   ├── constants.js             # Game physics constants
│   │   ├── index.css                # All styling
│   │   ├── components/
│   │   │   ├── Lobby.jsx            # [idle] screen - create/join room
│   │   │   ├── WaitingRoom.jsx      # [waiting] screen - waiting for P2
│   │   │   ├── GameCanvas.jsx       # [playing] screen - canvas drawing
│   │   │   ├── Scoreboard.jsx       # Score display overlay
│   │   │   ├── GameOver.jsx         # [gameover] screen - winner announcement
│   │   │   ├── Header.jsx           # (unused in current version)
│   │   │   ├── InputRow.jsx         # (unused)
│   │   │   └── MessageFeed.jsx      # (unused)
│   │   └── hooks/
│   │       └── useGameInput.js      # W/S/Arrow key listener
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
└── server/                          # Node.js Backend
    ├── index.js                     # Express + Socket.IO setup
    ├── package.json
    ├── game/
    │   ├── GameEngine.js            # Physics: tick, collisions, scoring
    │   ├── RoomManager.js           # Room storage & lookup
    │   └── constants.js             # Game physics constants
    └── socket/
        ├── index.js                 # Socket.IO connection handler
        ├── roomHandlers.js          # Room creation/join/disconnect
        └── gameHandlers.js          # Game start/paddle move/cleanup
```

### Key Files Deep-Dive

#### `client/src/App.jsx` - Game State Machine
```javascript
// Main states
gameState: 'idle' | 'waiting' | 'ready' | 'playing' | 'gameover'

// On mount: Listen for all socket events
useEffect(() => {
  socket.on('roomCreated', (data) => {
    setRoomCode(data.roomCode);
    setPlayerNumber(data.playerNumber);
    setGameState('waiting');
  });
  
  socket.on('roomReady', () => {
    setGameState('ready');
  });
  
  socket.on('gameState', (state) => {
    setPongState(state); // triggers canvas redraw
    setScores(state.scores);
  });
  
  // ... more listeners
}, []);

// Render based on state
if (gameState === 'idle') {
  return <Lobby />;
} else if (gameState === 'waiting') {
  return <WaitingRoom />;
} else if (gameState === 'playing') {
  return <GameCanvas gameState={pongState} />;
}
```

#### `server/game/GameEngine.js` - Physics Engine
```javascript
// Main function called every 16ms
function tick(gameState) {
  const { ball, paddles } = gameState;
  
  // 1. Move ball
  ball.x += ball.vx;
  ball.y += ball.vy;
  
  // 2. Top/bottom bounce
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy = Math.abs(ball.vy); // bounce down
  }
  if (ball.y + BALL_SIZE >= HEIGHT) {
    ball.y = HEIGHT - BALL_SIZE;
    ball.vy = -Math.abs(ball.vy); // bounce up
  }
  
  // 3. Paddle collisions (complex AABB logic)
  // Check if ball overlaps paddle rectangle
  // If yes: reverse vx, apply speedup, calculate angle from hit position
  
  // 4. Scoring (out of bounds)
  if (ball.x < 0) {
    scores[2]++; // P2 scores
    ball = resetBall();
  }
  if (ball.x > WIDTH) {
    scores[1]++; // P1 scores
    ball = resetBall();
  }
  
  // 5. Win condition
  if (scores[1] === WINNING_SCORE) {
    status = 'finished';
    winner = 1;
  }
  
  return { gameState, scored: 1|2|null };
}
```

#### `client/src/components/GameCanvas.jsx` - Rendering
```javascript
// Receives gameState prop (updated 60x/sec)
useEffect(() => {
  const ctx = canvas.getContext('2d');
  drawGame(ctx, gameState, playerNumber);
}, [gameState, playerNumber]);

// Drawing logic
function drawGame(ctx, gameState, playerNumber) {
  // Clear
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, 800, 500);
  
  // Center line
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#222';
  ctx.beginPath();
  ctx.moveTo(400, 0);
  ctx.lineTo(400, 500);
  ctx.stroke();
  
  // P1 Paddle
  ctx.fillStyle = playerNumber === 1 ? '#fff' : '#aaa';
  ctx.fillRect(20, paddles[1].y, 12, 80);
  
  // P2 Paddle
  ctx.fillStyle = playerNumber === 2 ? '#fff' : '#aaa';
  ctx.fillRect(768, paddles[2].y, 12, 80);
  
  // Ball
  ctx.fillStyle = '#fff';
  ctx.fillRect(ball.x, ball.y, 10, 10);
}
```

---

## 📦 Key Data Structures

### Room Object
```javascript
{
  code: 'XPQZ',                      // 4-letter room code
  players: ['socket_id_1', 'socket_id_2'],  // Socket IDs
  status: 'waiting' | 'playing' | 'finished',
  gameState: {                       // Added when game starts
    ball: {
      x: 400,
      y: 250,
      vx: 5,      // velocity x (pixels/tick)
      vy: -3,     // velocity y (pixels/tick)
    },
    paddles: {
      1: { y: 210 },  // only y changes (x is fixed)
      2: { y: 210 }
    },
    scores: {
      1: 2,
      2: 1
    },
    status: 'playing' | 'finished',
    winner: null | 1 | 2
  },
  createdAt: 1711270400000
}
```

### Client Game State (React)
```javascript
{
  gameState: 'idle' | 'waiting' | 'ready' | 'playing' | 'gameover',
  roomCode: 'XPQZ',
  playerNumber: 1 | 2 | null,
  roomError: 'Room not found' | '',
  pongState: {
    ball: { x, y, vx, vy },
    paddles: { 1: { y }, 2: { y } },
    scores: { 1: number, 2: number }
  },
  scores: { 1: number, 2: number },
  winner: 1 | 2 | null
}
```

---

## 🚀 Development & Running

### Installation & Setup

**Prerequisites:**
- Node.js v20.15+ (Vite requires v20.19+ or v22.12+)
- npm or yarn

**Clone & Install:**
```bash
cd pong/server
npm install

cd ../client
npm install
```

### Running Locally

**Terminal 1 - Start Server:**
```bash
cd server
node index.js
# Output: Server on http://localhost:3001
```

**Terminal 2 - Start Client Dev Server:**
```bash
cd client
npm run dev
# Output: 
#   ✔ Vite v7.3.1 ready in 785 ms
#   ➜  Local:   http://localhost:5174/
```

### Testing the Game

1. **Open Browser 1:** http://localhost:5174
   - Click "Create Room"
   - Share the 4-letter code (e.g., "XPQZ")

2. **Open Browser 2:** http://localhost:5174
   - Click "Join Room"
   - Enter the code "XPQZ"
   - Both should see "Game Ready!"

3. **Both Click "Start Game"**
   - Canvas appears with paddles and ball
   - Press W/S or Arrow keys to move paddle
   - Ball bounces, score updates when paddle hits
   - First to 5 points wins

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module './socket.index.js'" | Server index.js has wrong require path. Should be `require('./socket/index')` |
| "Cannot read properties of undefined (reading 'toUpperCase')" | roomCode validation missing in roomHandlers.js. Always check & normalize payload |
| Nothing displayed on screen | Check browser console. GameCanvas component had `require()` in function scope (Vite issue). Use ES6 imports at top. |
| Keyboard input not working | useGameInput hook was commented out or malformed. Ensure useEffect is active with proper key listeners. |
| Port already in use | Kill existing process: `taskkill /F /IM node.exe` (Windows) or `pkill node` (Mac/Linux) |

---

## 🔐 Security & Edge Cases

### Known Limitations (Not Addressed in Phase 3)

1. **No Authentication** - Anyone with a room code can join (by design for simplicity)
2. **No Persistence** - Rooms/scores vanish on server restart
3. **No Chat/Messaging** - Only game events, no text communication
4. **No Replay System** - No match history or recordings
5. **No Spectators** - Strictly 1v1 only
6. **No AI** - Both players must be human

### Potential Improvements

1. **User Accounts** - Store player names, ELO ratings, match history
2. **Database** - MongoDB for persistent room data & leaderboards
3. **Matchmaking Queue** - Auto-pair waiting players instead of room codes
4. **Replay System** - Record ball/paddle positions each tick
5. **Customization** - Choose paddle color, speed, map difficulty
6. **Mobile Support** - Touch controls for tablets/phones
7. **Admin Panel** - Monitor active games, player stats
8. **Sound Effects** - Ball bounce, scoring, game over sounds

---

## 📚 Quick Reference

### Socket Event Checklist

**Room Events:**
- ✅ `socket.emit('createRoom')` → Server generates code
- ✅ `socket.on('roomCreated', {roomCode, playerNumber})`
- ✅ `socket.emit('joinRoom', {code})` → Server validates
- ✅ `socket.on('roomJoined', {roomCode, playerNumber})`
- ✅ `io.to(code).emit('roomReady')` → Both players notified
- ✅ `socket.on('disconnect')` → Server cleans up room

**Game Events:**
- ✅ `socket.emit('startGame')` → Server starts game loop
- ✅ `socket.emit('paddleMove', {direction})` → Server updates paddle
- ✅ `io.to(code).emit('gameState', {ball, paddles, scores})` → 60x/sec
- ✅ `io.to(code).emit('scored', {scoredBy, scores})`
- ✅ `io.to(code).emit('gameOver', {winner, scores})`

### Game Loop Timing

```
Client keyboard input:    Every 16ms (60x/sec)
Server physics tick:      Every 16ms (60x/sec) 
Server→Client broadcast:  Every 16ms (60x/sec)
Client canvas redraw:     React triggers on gameState change (~60x/sec)
```

### Physics Constants Explained

```javascript
BALL_SPEED: 5
  └─ Initial ball velocity magnitude in pixels per tick

BALL_MAX_SPEED: 12
  └─ Cap to prevent game from becoming unplayable
  └─ Applied when ball speeds up on paddle hit (×1.05)

PADDLE_SPEED: 6
  └─ Pixels per tick when paddle moves
  └─ Actually not used in current code (paddleMove just sets position)

PADDLE_OFFSET: 20
  └─ Distance from left/right wall where paddle lives
  └─ P1 paddle at x=20, P2 paddle at x=768

WINNING_SCORE: 5
  └─ First to 5 points wins the match

TICK_RATE: 16.67ms
  └─ setInterval duration for 60 FPS
  └─ Calculated as 1000 / 60 = 16.666...
```

---

## 🎓 Learning Outcomes

After understanding this project, you'll know:

✅ **Real-Time Networking**
- WebSocket communication via Socket.IO
- Room-based message broadcasting
- Client-server synchronization patterns

✅ **Game Development**
- Physics simulation (movement, collisions)
- Game loop architecture (60 FPS tick-based)
- Canvas 2D rendering
- State machines for game flow

✅ **Full-Stack JavaScript**
- Frontend: React, Vite, hooks
- Backend: Node.js, Express, Socket.IO
- Event-driven architecture

✅ **Architecture Patterns**
- Handler registration pattern (room + game handlers)
- Singleton pattern (RoomManager shared instance)
- State machine (gameState transitions)
- Observer pattern (socket events)

---

**Last Updated:** March 23, 2026
**Project Status:** Phase 3 Complete (Gameplay Loop Working)
**Next Steps:** User accounts, database persistence, leaderboards

