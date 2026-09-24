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

  // Listen for room joining
  socket.on('join_room', (room) => {
    socket.join(room); // Socket.io method to group sockets into a specific room
    console.log(`[Socket] Client ${socket.id} joined room: ${room}`);
  });

  // Update - Send message only to the specific room
  socket.on('send_message', (payload) => {
    console.log(`[Server] Message in ${payload.room} from  ${payload.sender}: ${payload.text}`);
    
    // io.emit broadcasts the payload to all connected clients (including the sender)
    // Deprecated: io.emit('receive_message', payload)

    io.to(payload.room).emit('receive_message', payload);
  });

  // Update - Typing Start event: broadcast to room only (except sender)
  socket.on('typing', ({ username, room }) => {
    // Deprecated: socket.broadcast.emit('user_typing', username);
    // socket.to(room).emit sends to everyone in the room except the sender
    socket.to(room).emit('user_typing', username);
  });

  // Update : Typing Stop event: broadcast to room only except sender
  socket.on('stop_typing', ({ username, room }) => {
    socket.to(room).emit('user_stopped_typing', username);
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