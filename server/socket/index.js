const registerRoomHandlers = require('./roomHandlers');
const registerGameHandlers = require('./gameHandlers');

module.exports = function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Connected: ${socket.id.slice(0, 6)}`);

    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
  });
};
