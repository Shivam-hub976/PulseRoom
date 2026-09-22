const express = require('express');
const http = require('http'); // Node native HTTP module
const cors = require('cors');
const { Server } = require('socket.io'); // Import Socket.io server
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

// Listen for client handshakes and events
io.on('connection', (socket) => {
  console.log(`[Socket] Handshake successful! Client connected: ${socket.id}`);

  // When a client sends a message with sender identity and text
  socket.on('send_message', (payload) => {
    console.log(`[Server] Message from ${payload.sender}: ${payload.text}`);
    
    // io.emit broadcasts the payload to all connected clients (including the sender)
    io.emit('receive_message', payload);
  });

  // Typing Start event: broadcast to everyone except the person typing
  socket.on('typing', (username) => {
    socket.broadcast.emit('user_typing', username);
  });

  // Typing Stop event: broadcast to everyone except the person typing
  socket.on('stop_asarray', (username) => { // wait, let's keep it exact: 'stop_typing'
    socket.broadcast.emit('user_stopped_typing', username);
  });

  socket.on('stop_typing', (username) => {
    socket.broadcast.emit('user_stopped_typing', username);
  });

  // Listen for when a client closes the tab or drops connection
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'PulseRoom API with WebSockets' });
});

// Start both HTTP and WebSockets on the same port
server.listen(PORT, () => {
  console.log(`[Server] HTTP & WebSocket pipeline listening on port ${PORT}`);
});