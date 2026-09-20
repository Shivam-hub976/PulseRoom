const express = require('express');
const http = require('http'); // Node native module
const cors = require('cors');
const { Server } = require('socket.io'); // Import Socket.io
require('dotenv').config();

const app = express();
const server = http.createServer(app); // Wrap Express app with HTTP server
const PORT = process.env.PORT || 5000;

// Standard HTTP CORS (For Express routes like /health)
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST']
}));
app.use(express.json());

// WebSocket CORS Configuration 
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ["GET", "POST"]
  }
});

// Listen for client handshakes 
io.on('connection', (socket) => {
  console.log(`[Socket] Handshake successful! Client connected: ${socket.id}`);

  // when a client emits send message events
  socket.on('send_message', (payload) => {
    console.log(`[Server] Message received: ${payload.text}`);
    
    // io.emit broadcasts message to all clients (including sender)
    io.emit('receive_message', payload);
  });

  // Listen for when a client closes the tab or drops connection
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'PulseRoom API with WebSockets' });
});

// We use server.listen() instead of app.listen() to start BOTH HTTP and WebSockets
server.listen(PORT, () => {
  console.log(`[Server] HTTP & WebSocket pipeline listening on port ${PORT}`);
});