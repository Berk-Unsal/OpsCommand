const express = require('express');
const http = require('http'); // Required for WebSockets
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // Wrap Express with HTTP server
const PORT = 4000;

app.use(cors());
app.use(express.json());

// 1. Setup Socket.io and configure CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allow your React frontend to connect
    methods: ["GET", "POST"]
  }
});

// 2. The WebSocket Logic
io.on('connection', (socket) => {
  console.log(`🔌 Engineer connected: ${socket.id}`);

  // Listen for messages from the frontend
  socket.on('send_message', (data) => {
    console.log("Message received:", data);
    
    // Broadcast the message to ALL connected users
    io.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Engineer disconnected: ${socket.id}`);
  });
});

// 3. Keep the old Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', service: 'OpsCommand Backend' });
});

// IMPORTANT: Change app.listen to server.listen
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OpsCommand Backend & WebSockets running on http://0.0.0.0:${PORT}`);
});