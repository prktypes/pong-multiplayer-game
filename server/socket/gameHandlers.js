const { createGameState, tick, movePaddle } = require('../game/GameEngine');
const roomManager = require('../game/RoomManager');
const C = require('../game/constants');

// Stores active game loops: roomCode → intervalId
const gameLoops = new Map();

module.exports = function registerGameHandlers(io, socket) {

  // ── START GAME ─────────────────────────────────────────────
  // Emitted by frontend when roomReady fires
  socket.on('startGame', () => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (!room) return;

    // Only start once — if loop already running, ignore
    if (gameLoops.has(room.code)) return;

    // Attach fresh game state to the room
    room.gameState = createGameState();
    room.status    = 'playing';

    console.log(`Game started in room ${room.code}`);

    // ── Game Loop ────────────────────────────────────────────
    // Runs every 16ms (~60fps)
    // Every tick: move ball → check collisions → emit state
    const roomCode = room.code; // capture code before async loop

    const loopId = setInterval(() => {
      const currentRoom = roomManager.getRoom(roomCode); // fresh lookup every tick

      if (!currentRoom || !currentRoom.gameState) {
        clearInterval(loopId);
        gameLoops.delete(roomCode);
        return;
      }

      const { gameState, scored } = tick(currentRoom.gameState);

      if (scored) {
        io.to(roomCode).emit('scored', {
          scoredBy: scored,
          scores:   gameState.scores,
        });
      }

      if (gameState.status === 'finished') {
        io.to(roomCode).emit('gameOver', {
          winner: gameState.winner,
          scores: gameState.scores,
        });
        clearInterval(loopId);
        gameLoops.delete(roomCode);
        currentRoom.status = 'finished';
        return;
      }

      io.to(roomCode).emit('gameState', {
        ball:    gameState.ball,
        paddles: gameState.paddles,
        scores:  gameState.scores,
      });
    }, C.TICK_RATE);

    gameLoops.set(roomCode, loopId);
  });


  // ── PADDLE MOVE ────────────────────────────────────────────
  // Frontend emits this on keydown/keyup
  socket.on('paddleMove', ({ direction }) => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (!room || !room.gameState) return;

    // Figure out which player number this socket is
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    movePaddle(room.gameState, player.playerNumber, direction);
  });


  // ── CLEANUP on disconnect ──────────────────────────────────
  // Stop the game loop if a player leaves mid-game
  socket.on('disconnect', () => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (!room) return;

    const loopId = gameLoops.get(room.code);
    if (loopId) {
      clearInterval(loopId);
      gameLoops.delete(room.code);
      console.log(`Game loop stopped for room ${room.code}`);
    }
  });

};

// Helper — find room directly by code
function findRoomByCode(code) {
  return code ? roomManager.getRoom(code) : null;
}