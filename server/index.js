const express = require('express');
const http = require('http');
const { Server } = require('socket.io'); // Import the Server class from socket.io
const cors = require('cors');

dotenv = require('dotenv');
dotenv.config();
// Create an Express application
const app = express();
app.use(cors());

// Create an HTTP server and wrap the Express app - socket.io works on top of the HTTP server
const server = http.createServer(app);

//attached socket.io to the HTTP server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",    // Your React dev server
    methods: ["GET", "POST"]
  }
});

//testing a simple rest route
app.get('/',(req,res)=>{
    res.send('pong server is running');
})

// now we build the socket.io logic
//this will run every time a new browswer connects to the server
let connectedPlayers = 0; // Keep track of connected players

io.on('connection', (socket) => {
  connectedPlayers++;
  console.log(`Player connected | ID: ${socket.id} | Connected Players: ${connectedPlayers}`);
  // Send a private welcome message to THIS socket only
  socket.emit('welcome', {
    message: 'Connected to Pong server!',
    yourId: socket.id,
    totalPlayers: connectedPlayers
  });

  // Tell EVERYONE ELSE (not the newcomer) that someone joined
  socket.broadcast.emit('playerJoined', {
    message: `A new player joined`,
    playerId: socket.id
  });

  // ── Listen for a 'message' event from this client ──────────
  socket.on('message', (data) => {
    console.log(`Message from ${socket.id}: ${data.text}`);

    // Broadcast to ALL connected sockets (including sender)
    io.emit('message', {
      from: socket.id,
      text: data.text,
      timestamp: new Date().toISOString()
    });
});
// ── Listen for disconnect ───────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`Player disconnected | ID: ${socket.id} | Reason: ${reason}`);
    connectedPlayers--;
    console.log(`Connected Players: ${connectedPlayers}`);

    // Notify everyone still connected
    io.emit('playerLeft', {
      message: `A player disconnected`,
      playerId: socket.id
    });
  });
});
const PORT = process.env.PORT;
server.listen(PORT,()=>{
    console.log(`Pong Server is running on http://localhost:${PORT}}`);
    console.log(`Websocket server is ready!`)
});
