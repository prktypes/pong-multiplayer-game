const express = require('express');
const http = require('http');
const { Server } = require('socket.io'); // Import the Server class from socket.io
const cors = require('cors');
// Create an Express application
const app = express();
app.use(cors());

// Create an HTTP server and wrap the Express app - socket.io works on top of the HTTP server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",    // Your React dev server
    methods: ["GET", "POST"]
  }
});