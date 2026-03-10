import { io } from 'socket.io-client';

// Connect once, reuse everywhere
// Without this, every component that imports socket
// would create a NEW connection — that's a bug
const socket = io('http://localhost:3001', {
  autoConnect: true   // connects immediately on import
});

export default socket;