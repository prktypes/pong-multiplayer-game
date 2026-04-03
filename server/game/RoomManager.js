class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code;
    do {
      code = Array.from({ length: 4 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(socketId) {
    const code = this.generateCode();
    this.rooms.set(code, {
      code,
      players: [{ id: socketId, playerNumber: 1 }],
      status: 'waiting',
      createdAt: Date.now()
    });
    return code;
  }

  joinRoom(code, socketId) {
    const room = this.rooms.get(code);

    if (!room)                return { error: 'Room not found' };
    if (room.players.length >= 2) return { error: 'Room is full' };
    if (room.players.find(p => p.id === socketId)) return { error: 'Already in this room' };

    room.players.push({ id: socketId, playerNumber: 2 });
    room.status = 'playing';
    return { room };
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  getRoomBySocketId(socketId) {
    for (const [code, room] of this.rooms) {
      if (room.players.find(p => p.id === socketId)) return room;
    }
    return null;
  }

  removePlayer(socketId) {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return null;

    room.players = room.players.filter(p => p.id !== socketId);

    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return { room, roomDeleted: true };
    }

    room.status = 'waiting';
    return { room, roomDeleted: false };
  }

  logRooms() {
    console.log(`\nActive rooms: ${this.rooms.size}`);
    for (const [code, room] of this.rooms) {
      console.log(`  ${code} | players: ${room.players.length}/2 | status: ${room.status}`);
    }
  }
}

module.exports = new RoomManager();