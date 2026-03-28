# PONG Game - Architecture & Workflow Guide

## Quick Reference Map

This document is your **quick reference** to understand the entire project structure, data flow, and game mechanics at a glance.

---

## 🏗️ System Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│                   (Client - React/Canvas)                   │
│                                                              │
│  App.jsx (State Machine)                                    │
│  ├─ Lobby.jsx          [idle state]                         │
│  ├─ WaitingRoom.jsx    [waiting state]                      │
│  ├─ GameCanvas.jsx     [playing/gameover states]            │
│  └─ useGameInput.js    [W/S/Arrow key listeners]            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          ↕ Socket.IO Events
                     (Bidirectional WebSockets)
┌─────────────────────────────────────────────────────────────┐
│                    COMMUNICATION LAYER                       │
│                     (Socket.IO Server)                       │
│                                                              │
│  socket/index.js          [Connection handler]              │
│  ├─ roomHandlers.js       [Room CRUD operations]            │
│  └─ gameHandlers.js       [Game loop & physics updates]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                             ↕ In-Memory
┌─────────────────────────────────────────────────────────────┐
│                      LOGIC LAYER                             │
│                    (Node.js Backend)                         │
│                                                              │
│  game/GameEngine.js       [Physics & collision detection]   │
│  game/RoomManager.js      [Room lifecycle management]       │
│  game/constants.js        [Game parameters & speeds]        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Data Flow Diagram

### From Player Input to Screen Update

```
Player presses 'W'
     ↓
useGameInput hook detects key
     ↓
socket.emit('paddleMove', {direction: 'up'})
     ↓ [Over network - ~instant]
     ↓
Server receives in gameHandlers.js
     ↓
movePaddle(gameState, playerNumber, 'up')
     ↓
gameState.paddles[1].y -= PADDLE_SPEED
     ↓
[Next game tick - 16ms later]
     ↓
tick(gameState) executes
  • Updates ball physics
  • Checks paddle collision with new paddle position
  • Updates scores if needed
     ↓
io.to(roomCode).emit('gameState', {ball, paddles, scores})
     ↓ [Over network - ~instant]
     ↓
Client receives in App.jsx
     ↓
setPongState(state) // React state update
     ↓
GameCanvas component re-renders
     ↓
useEffect triggers with new pongState
     ↓
drawGame(ctx, gameState, playerNumber)
     ↓
Player sees updated paddle & ball on screen
```

**Total latency:** ~16ms (plus network round-trip)

---

## 🎮 Game State Machine

### Client-Side State Flow

```javascript
// Five possible states - only one active at a time

idle
  ↓
  Trigger: User clicks "Create Room" or "Join Room"
  ↓
waiting
  ↓
  Trigger: Both players connected + roomReady signal from server
  ↓
ready
  ↓
  Trigger: User clicks "Start Game"
  ↓
playing
  ├─→ (If opponent disconnects) back to waiting
  └─→ (If someone reaches 5 points) to gameover
  ↓
gameover
  ↓
  Trigger: User clicks "Play Again" → back to playing
  OR      Disconnects → back to idle
```

### Corresponding Server Room States

```
Room doesn't exist
  ↓
  createRoom('XPQZ', player1_socket_id)
  ↓
Room: {code: 'XPQZ', players: [id1], status: 'waiting'}
  ↓
  joinRoom('XPQZ', player2_socket_id)
  ↓
Room: {code: 'XPQZ', players: [id1, id2], status: 'waiting'}
  ↓
  [Both players emit startGame]
  ↓
Room: {..., status: 'playing', gameState: {...}}
  ↓
  [Game loop running, physics updating every 16ms]
  ↓
  [Score reaches 5]
  ↓
Room: {..., status: 'finished', winner: 1}
  ↓
  [Loop clears, room stays in memory until player leaves]
  ↓
  disconnect() or leaveRoom()
  ↓
Room is deleted from RoomManager.rooms Map
```

---

## 📡 Socket Event Reference

### Room Management Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `createRoom` | Client → Server | `{}` | Create new room, get code |
| `roomCreated` | Server → Client | `{roomCode, playerNumber}` | Room created successfully |
| `joinRoom` | Client → Server | `{code: 'XPQZ'}` | Join existing room |
| `roomJoined` | Server → Client | `{roomCode, playerNumber}` | Joined successfully |
| `roomReady` | Server → Both | `{roomCode, message}` | 2 players connected, ready |
| `disconnect` | Server Event | N/A | Player left/connection lost |
| `opponentLeft` | Server → Remaining | `{message}` | Other player disconnected |

### Gameplay Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `startGame` | Client → Server | `{}` | Begin game, start loop |
| `paddleMove` | Client → Server | `{direction: 'up'\|'down'}` | Move paddle |
| `gameState` | Server → Both | `{ball, paddles, scores}` | Sent every ~16ms |
| `scored` | Server → Both | `{scoredBy: 1\|2, scores}` | Goal scored |
| `gameOver` | Server → Both | `{winner, scores}` | Game finished |

---

## ⚡ The 60 FPS Game Loop

### Server-Side Loop (Every 16ms)

```javascript
setInterval(() => {
  // 1. FETCH LATEST STATE
  const room = roomManager.getRoom(roomCode);
  if (!room?.gameState) return; // Safety check
  
  // 2. PHYSICS TICK
  const {gameState, scored} = tick(room.gameState);
  // Inside tick():
  //   - Move ball: x += vx, y += vy
  //   - Bounce off walls
  //   - Check paddle collisions
  //   - Check scoring (ball out of bounds)
  //   - Check win condition
  
  // 3. EMIT SCORE EVENT (if applicable)
  if (scored) {
    io.to(roomCode).emit('scored', {
      scoredBy: scored,
      scores: gameState.scores
    });
  }
  
  // 4. EMIT GAME OVER (if applicable)
  if (gameState.status === 'finished') {
    io.to(roomCode).emit('gameOver', {
      winner: gameState.winner,
      scores: gameState.scores
    });
    clearInterval(loopId); // Stop loop
    return;
  }
  
  // 5. BROADCAST GAME STATE (every frame)
  io.to(roomCode).emit('gameState', {
    ball: gameState.ball,
    paddles: gameState.paddles,
    scores: gameState.scores
  });
  
}, 16.67); // ~60 FPS
```

### Client-Side Rendering (Event-Driven)

```javascript
// React listens for gameState events
socket.on('gameState', (state) => {
  setPongState(state); // Triggers re-render
  setScores(state.scores);
});

// In GameCanvas component
useEffect(() => {
  if (!gameState) return;
  
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, 800, 500);
  
  // Draw components
  drawGame(ctx, gameState, playerNumber);
  
}, [gameState, playerNumber]); // Re-runs ~60x/sec
```

---

## 🎯 Physics Engine Breakdown

### Ball Movement Algorithm

```javascript
function tick(gameState) {
  const {ball, paddles, scores} = gameState;
  
  // STEP 1: Apply velocity
  ball.x += ball.vx;  // Add horizontal velocity
  ball.y += ball.vy;  // Add vertical velocity
  
  // STEP 2: Wall collisions (top/bottom)
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy = Math.abs(ball.vy); // Bounce down
  }
  if (ball.y + BALL_SIZE >= HEIGHT) {
    ball.y = HEIGHT - BALL_SIZE;
    ball.vy = -Math.abs(ball.vy); // Bounce up
  }
  
  // STEP 3: Paddle collision (Player 1 - left side)
  if (ballOverlapsPaddle(ball, paddles[1], PLAYER_1_X)) {
    ball.x = PLAYER_1_X + PADDLE_WIDTH;
    ball.vx = Math.abs(ball.vx) * 1.05; // Bounce right + speedup
    ball.vy = calculateAngle(ball, paddles[1]);
  }
  
  // STEP 4: Paddle collision (Player 2 - right side)
  if (ballOverlapsPaddle(ball, paddles[2], PLAYER_2_X)) {
    ball.x = PLAYER_2_X - BALL_SIZE;
    ball.vx = -Math.abs(ball.vx) * 1.05; // Bounce left + speedup
    ball.vy = calculateAngle(ball, paddles[2]);
  }
  
  // STEP 5: Scoring (ball leaves play area)
  if (ball.x < 0) {
    scores[2]++;
    scored = 2;
    ball = resetBall(); // Reset to center
  }
  if (ball.x > WIDTH) {
    scores[1]++;
    scored = 1;
    ball = resetBall();
  }
  
  // STEP 6: Win condition
  if (scores[1] === WINNING_SCORE) {
    status = 'finished';
    winner = 1;
  } else if (scores[2] === WINNING_SCORE) {
    status = 'finished';
    winner = 2;
  }
  
  return {gameState, scored};
}
```

### Angle Calculation (Why the Ball Curves)

```javascript
// Ball speed varies based on WHERE it hits the paddle
// Top of paddle → goes up steeply
// Middle of paddle → goes straight
// Bottom of paddle → goes down steeply

function calculateAngle(ball, paddle) {
  // hitPos ranges from 0 (top) to 1 (bottom)
  const hitPos = (ball.y - paddle.y) / PADDLE_HEIGHT;
  
  // Map hitPos to angle: -1 (straight up) to +1 (straight down)
  const angle = (hitPos - 0.5) * 2;
  
  // Convert angle to velocity
  const vy = angle * BALL_MAX_SPEED;
  
  return vy;
}

// Example:
// Ball hits top of paddle (hitPos = 0)
//   → angle = -1
//   → vy = -12 (max speed upward)
//
// Ball hits middle (hitPos = 0.5)
//   → angle = 0
//   → vy = 0 (horizontal)
//
// Ball hits bottom (hitPos = 1)
//   → angle = 1
//   → vy = 12 (max speed downward)
```

---

## 📦 Data Structures

### Room Object (Server-Side)

```javascript
{
  code: 'XPQZ',                    // 4-letter unique identifier
  players: [
    'socket_id_1',                 // Player 1 socket ID
    'socket_id_2'                  // Player 2 socket ID
  ],
  status: 'waiting',               // 'waiting' | 'playing' | 'finished'
  gameState: {                     // Added when game starts
    ball: {
      x: 400,                       // Pixel position
      y: 250,
      vx: 5,                        // Velocity (pixels/tick)
      vy: -3
    },
    paddles: {
      1: { y: 210 },               // Only Y changes (X is fixed at edge)
      2: { y: 210 }
    },
    scores: {
      1: 2,                         // Points for P1
      2: 1                          // Points for P2
    },
    status: 'playing',
    winner: null
  },
  createdAt: 1711270400000         // Timestamp for debugging
}
```

### Client Game State (React)

```javascript
{
  gameState: 'idle',               // Screen to display
  roomCode: 'XPQZ',               // Current room code
  playerNumber: 1,                // This player's number
  roomError: '',                  // Error message if any
  pongState: {                    // Latest from server
    ball: {x, y, vx, vy},
    paddles: {1: {y}, 2: {y}},
    scores: {1: number, 2: number}
  },
  scores: {1: 0, 2: 0},           // For display
  winner: null                    // 1 | 2 | null
}
```

---

## 🔌 Complete Event Timeline

### Session Example: Player 1 Creates, Player 2 Joins, They Play

```
═══════════════════════════════════════════════════════════════════

T=0s — PLAYER 1 BROWSER
  Screen: Lobby (idle state)
  Action: Click "Create Room"
  
  Client → Server: emit 'createRoom'
  Server: generateCode() → 'XPQZ'
          createRoom(socket1_id)
          socket.join('XPQZ')
  Server → Client: emit 'roomCreated' {roomCode: 'XPQZ', playerNumber: 1}
  
  Client: setGameState('waiting')
          setRoomCode('XPQZ')
          setPlayerNumber(1)
  Screen: WaitingRoom showing "XPQZ"

═══════════════════════════════════════════════════════════════════

T=3s — PLAYER 2 BROWSER
  Screen: Lobby (idle state)
  Action: Enter 'XPQZ', click "Join"
  
  Client → Server: emit 'joinRoom' {code: 'XPQZ'}
  Server: joinRoom('XPQZ', socket2_id)
          Validates: room exists ✓, not full ✓, player not already here ✓
          Add to players[]
          socket.join('XPQZ')
  Server → Client 2: emit 'roomJoined' {roomCode: 'XPQZ', playerNumber: 2}
  
  Client 2: setGameState('waiting')
            setPlayerNumber(2)
  Screen: WaitingRoom
  
  Server → BOTH: io.to('XPQZ').emit 'roomReady' {message: 'Both connected!'}
  
  Client 1 & 2: setGameState('ready')
  Screen (both): "Game Ready! Player X. Start Game?" button

═══════════════════════════════════════════════════════════════════

T=5s — BOTH PLAYERS READY
  Both see the "Start Game?" button
  Player 1 clicks "Start Game"
  
  Client 1 → Server: emit 'startGame'
  Server: room.gameState = createGameState()
          room.status = 'playing'
          Start setInterval (16ms tick) → Game loop runs
          
  [No immediate response to client]
  
  T=5.016s
  Game Loop Tick #1:
    tick(gameState) → ball moves, no collisions yet
    io.to('XPQZ').emit 'gameState' {ball, paddles, scores}
  
  Client 1 & 2: socket.on('gameState', (state) => setPongState(state))
  Component: <GameCanvas gameState={pongState} />
  Screen: Canvas with paddles at center, ball at center
  
  T=5.032s — Player 1 presses 'W'
  useGameInput detects key
  Client 1 → Server: emit 'paddleMove' {direction: 'up'}
  Server: movePaddle(gameState, 1, 'up')
          paddles[1].y -= PADDLE_SPEED
  
  T=5.048s — Game Loop Tick #2
  tick(gameState):
    ball.x += ball.vx   (moves toward P1)
    ball.y += ball.vy
    Check collision: ball overlaps paddles[1]? 
    → YES! Ball at paddle position
    → ball.vx = -Math.abs(ball.vx) * 1.05 (bounces back)
    → ball.vy calculated from hit angle
    (No one scored, status still 'playing')
  
  io.to('XPQZ').emit 'gameState'
  
  Both screens update: Ball bounced off P1 paddle, moving toward P2

═══════════════════════════════════════════════════════════════════

[Continue for ~30 seconds of gameplay]

T=35s — SCORING MOMENT
  Game Loop Tick #1802:
  tick(gameState):
    ball.x += ball.vx  (moves past right wall)
    ball.x > CANVAS_WIDTH  → YES!
    scores[1]++  (P1 scores)
    scored = 1
    ball = resetBall()  (ball returns to center)
  
  io.to('XPQZ').emit 'scored' {scoredBy: 1, scores: {1: 1, 2: 0}}
  
  Client 1 & 2: socket.on('scored', (data) => setScores(data.scores))
  Screen: Scoreboard updates to show "1 - 0"
  
  Next gameState broadcast shows centered ball

═══════════════════════════════════════════════════════════════════

T=45s — GAME OVER
  Game Loop Tick #2802:
  tick(gameState):
    [Normal physics]
    if (scores[1] === 5) {
      status = 'finished'
      winner = 1
    }
  
  io.to('XPQZ').emit 'gameOver' {winner: 1, scores: {1: 5, 2: 2}}
  clearInterval(loopId)  [Loop stops]
  
  Client 1 & 2: socket.on('gameOver', (data) => {
    setWinner(1)
    setScores(data.scores)
    setGameState('gameover')
  })
  Screen: "Player 1 Wins! 5-2" with "Play Again?" button

═══════════════════════════════════════════════════════════════════

T=46s — PLAY AGAIN
  Player 2 clicks "Play Again"
  
  Client → Server: emit 'startGame'
  Server: room.gameState = createGameState()  [Fresh game]
          Start new setInterval
  
  [Back to T=5s, new game begins]

═══════════════════════════════════════════════════════════════════
```

---

## 🛠️ RoomManager Reference

### What It Does

```javascript
class RoomManager {
  constructor() {
    this.rooms = new Map();  // {code: 'XPQZ' → room object}
  }
  
  // Generate unique 4-letter code (no I, O to avoid confusion)
  generateCode() { /* ... */ }
  
  // Create new room with player 1
  createRoom(socketId) {
    code = generateCode()
    rooms.set(code, {code, players: [socketId], status: 'waiting'})
    return code
  }
  
  // Add player 2 to room
  joinRoom(code, socketId) {
    room = rooms.get(code)
    if (!room) return {error: 'Not found'}
    if (room.players.length >= 2) return {error: 'Full'}
    room.players.push(socketId)
    room.status = 'playing'  // ← Actually should be 'ready'
    return {room}
  }
  
  // Find which room a player is in
  getRoomBySocketId(socketId) {
    for (const [code, room] of rooms) {
      if (room.players.includes(socketId)) return room
    }
    return null
  }
  
  // Remove player and delete empty rooms
  removePlayer(socketId) {
    room = getRoomBySocketId(socketId)
    if (!room) return null
    
    room.players = room.players.filter(id => id !== socketId)
    
    if (room.players.length === 0) {
      rooms.delete(room.code)
      return {room, roomDeleted: true}
    } else {
      room.status = 'waiting'
      return {room, roomDeleted: false}
    }
  }
}

// SINGLETON PATTERN
module.exports = new RoomManager()  // Always same instance
```

---

## 📊 Constants Explained

### Game Physics

```javascript
CANVAS_WIDTH:   800        // Play area width (pixels)
CANVAS_HEIGHT:  500        // Play area height (pixels)

PADDLE_WIDTH:   12         // Paddle thickness
PADDLE_HEIGHT:  80         // Paddle length
PADDLE_SPEED:   6          // Pixels per tick when moving (not actually used)
PADDLE_OFFSET:  20         // Distance from left/right wall
// Example: P1 paddle X position = 20
//          P2 paddle X position = 800 - 20 - 12 = 768

BALL_SIZE:      10         // Square (10×10 pixels)
BALL_SPEED:     5          // Initial velocity magnitude
BALL_MAX_SPEED: 12         // Cap after speedup bounces

WINNING_SCORE:  5          // First to 5 wins
TICK_RATE:      16.67ms    // 1000ms ÷ 60 fps = 16.67ms
```

---

## 🚀 Quick Start (5 Minutes)

### Terminal 1 - Server
```bash
cd server
npm install
node index.js
# Output: Server on http://localhost:3001
```

### Terminal 2 - Client
```bash
cd client
npm install
npm run dev
# Output: ➜ Local: http://localhost:5174
```

### Browser 1 - Create
1. Go to `http://localhost:5174`
2. Click "Create Room"
3. Copy the code (e.g., "XPQZ")

### Browser 2 - Join
1. Go to `http://localhost:5174`
2. Click "Join Room"
3. Paste the code, press Enter
4. Both show "Game Ready!"

### Play
1. Both click "Start Game"
2. Press **W/ArrowUp** to move up, **S/ArrowDown** to move down
3. First to 5 points wins!

---

## 🔍 Debugging Checklist

| Problem | Check |
|---------|-------|
| Nothing on screen | Open DevTools console for JS errors |
| Can't see other player's paddle | Check socket connection (network tab) |
| Ball doesn't move | Server game loop not starting (check 'startGame' event) |
| Keyboard not working | useGameInput hook - is it activated? gameState === 'playing'? |
| "Room not found" error | Make sure both players use EXACT same code |
| Server crash on join | roomHandlers.js payload validation |
| Port 3001 in use | `taskkill /F /IM node.exe` (Windows) |

---

## 📚 File Map

```
server/
├─ index.js                ← Start here: Express + Socket.IO setup
├─ socket/
│  ├─ index.js            ← Event dispatcher
│  ├─ roomHandlers.js     ← Create/join/disconnect rooms
│  └─ gameHandlers.js     ← Game loop & physics
└─ game/
   ├─ RoomManager.js      ← In-memory room storage
   ├─ GameEngine.js       ← Physics engine
   └─ constants.js        ← Game tuning parameters

client/
├─ src/
│  ├─ App.jsx             ← Main game component (state machine)
│  ├─ socket.js           ← Socket.IO client initialization
│  ├─ components/
│  │  ├─ Lobby.jsx        ← Create/join UI
│  │  ├─ WaitingRoom.jsx  ← Waiting for opponent
│  │  ├─ GameCanvas.jsx   ← Canvas rendering
│  │  ├─ Scoreboard.jsx   ← Score display
│  │  └─ GameOver.jsx     ← Winner announcement
│  ├─ hooks/
│  │  └─ useGameInput.js  ← Keyboard listener
│  ├─ constants.js        ← UI constants
│  └─ index.css           ← All styling
├─ vite.config.js         ← Dev server config
└─ package.json
```

---

## 🎓 Key Concepts

### Synchronization
- **Server is source of truth** - All physics calculations happen server-side
- **Client renders predictions** - Canvas updates every frame from server broadcasts
- **Latency is hidden** - 60 FPS broadcast masks network delays

### State Management
- **React component state** - Manages UI state (gameState, scores, winner)
- **Socket events** - Drive state transitions (roomCreated, roomReady, gameState)
- **Server-side room state** - Persists game data while players connected

### Real-Time Pattern
- **Event-driven** - No polling, instant server→client updates
- **Broadcasting** - `io.to(roomCode).emit()` sends to both players
- **Bi-directional** - Client emits actions, server sends game updates

---

**Last Updated:** March 23, 2026  
**Status:** Complete & Working  
**Next Phase:** Database persistence & leaderboards

