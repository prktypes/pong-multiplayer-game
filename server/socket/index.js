// ── socket/index.js ────────────────────────────────────────────
// Central router — every new connection gets all handlers attached.
// As we add phases, we just add more registerXHandlers() calls here.

const registerRoomHandlers = require('./roomHandlers');

module.exports = function initSocket(io) {

  io.on('connection', (socket) => {
    console.log(`Connected: ${socket.id.slice(0, 6)} | Rooms: ${io.engine.clientsCount}`);

    // Register all event handlers for this socket
    registerRoomHandlers(io, socket);

    // Phase 3: registerGameHandlers(io, socket)
    // Phase 4: registerChatHandlers(io, socket)
  });

};