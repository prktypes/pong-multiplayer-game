const roomManager = require('../game/RoomManager');

// This function receives the socket and io instance
// and registers all room-related event listeners for that socket
function registerRoomHandlers(io, socket) {

  // ── CREATE ROOM ─────────────────────────────────────────────
  socket.on('createRoom', () => {
    // If already in a room, don't create another
    const existingRoom = roomManager.getRoomBySocketId(socket.id);
    if (existingRoom) {
      socket.emit('joinError', { message: 'You are already in a room' });
      return;
    }

    const code = roomManager.createRoom(socket.id);

    // Join the socket.io room with this code
    // This is what enables io.to(code).emit() later
    socket.join(code);

    socket.emit('roomCreated', {
      roomCode: code,
      playerNumber: 1
    });

    console.log(`Room created: ${code} by ${socket.id.slice(0, 6)}`);
    roomManager.logRooms();
  });

  // ── JOIN ROOM ────────────────────────────────────────────────
  socket.on('joinRoom', ({ roomCode }) => {
    const code = roomCode.toUpperCase().trim();
    const result = roomManager.joinRoom(code, socket.id);

    if (result.error) {
      socket.emit('joinError', { message: result.error });
      return;
    }

    // Join the socket.io room
    socket.join(code);

    // Tell player 2 they joined successfully
    socket.emit('roomJoined', {
      roomCode: code,
      playerNumber: 2
    });

    // Tell BOTH players the room is ready
    // io.to(code) sends to everyone in that room — player 1 and player 2
    io.to(code).emit('roomReady', {
      roomCode: code,
      message: 'Both players connected. Get ready!'
    });

    console.log(`Room joined: ${code} by ${socket.id.slice(0, 6)}`);
    roomManager.logRooms();
  });

  // ── DISCONNECT ───────────────────────────────────────────────
  // This fires automatically when a socket disconnects for any reason
  socket.on('disconnect', () => {
    const result = roomManager.removePlayer(socket.id);
    if (!result) return; // player wasn't in any room

    const { room, roomDeleted } = result;

    if (!roomDeleted) {
      // Someone is still in the room — notify them
      io.to(room.code).emit('opponentLeft', {
        message: 'Your opponent disconnected. Waiting for a new player...'
      });
      console.log(`Player left room ${room.code}. Room still active.`);
    } else {
      console.log(`Room ${room.code} deleted — both players gone.`);
    }

    roomManager.logRooms();
  });
}

module.exports = registerRoomHandlers;