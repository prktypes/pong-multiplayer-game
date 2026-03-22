// A pure JavaScript class — no database, no mongoose.
// Rooms are temporary. They live in memory while players are connected.
// When both players leave, the room is gone. That's correct behavior.

class RoomManager {
  constructor() {
    // Map is like an object but better for frequent add/delete
    // Structure: { 'ABCD' → { code, players: [], status, createdAt } }
    this.rooms = new Map();
  }

  // Generate a random 4-letter uppercase code
  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // removed I and O (look like 1 and 0)
    let code;
    do {
      code = Array.from({ length: 4 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
    } while (this.rooms.has(code)); // regenerate if code already exists
    return code;
  }

  createRoom(socketId) {
    const code = this.generateCode();
    this.rooms.set(code, {
      code,
      players: [socketId],      // player 1 is the creator
      status: 'waiting',        // waiting | playing | finished
      createdAt: Date.now()
    });
    return code;
  }

  joinRoom(code, socketId) {
    const room = this.rooms.get(code);

    // Validate
    if (!room)                          return { error: 'Room not found' };
    if (room.players.length >= 2)       return { error: 'Room is full' };
    if (room.players.includes(socketId)) return { error: 'Already in this room' };

    room.players.push(socketId);        // player 2 joins
    room.status = 'playing';
    return { room };
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  // Find which room a socket is in
  getRoomBySocketId(socketId) {
    for (const [code, room] of this.rooms) {
      if (room.players.includes(socketId)) return room;
    }
    return null;
  }
  removePlayer(socketId) {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return null;

    room.players = room.players.filter(id => id !== socketId);

    // If room is now empty, delete it entirely
    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return { room, roomDeleted: true };
    }

    // One player still in room — set back to waiting
    room.status = 'waiting';
    return { room, roomDeleted: false };
  }

  // Useful for debugging — log all active rooms
  logRooms() {
    console.log(`\nActive rooms: ${this.rooms.size}`);
    for (const [code, room] of this.rooms) {
      console.log(`   ${code} | players: ${room.players.length}/2 | status: ${room.status}`);
    }
  }
}

// Export a single shared instance — every file that imports this
// gets the SAME RoomManager with the SAME rooms Map
module.exports = new RoomManager();