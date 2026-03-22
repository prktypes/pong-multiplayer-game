const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const initSocket = require('./socket/index');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
//

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Hand off all socket logic to socket/index.js
initSocket(io);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
});