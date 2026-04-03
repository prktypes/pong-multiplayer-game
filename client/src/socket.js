import { io } from 'socket.io-client';

const URL = import.meta.env.PROD
  ? import.meta.env.VITE_SERVER_URL   // ← from .env on Vercel
  : 'http://localhost:3001';

const socket = io(URL, {
  autoConnect: true,
  transports: ['websocket', 'polling']  // ← always include polling as fallback
});

export default socket;