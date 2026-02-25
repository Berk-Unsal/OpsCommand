const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mongoose = require('mongoose'); // Import Mongoose

const app = express();
const server = http.createServer(app);
const PORT = 4000;

app.use(cors());
app.use(express.json());

// 1. Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/opscommand';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 2. Define the Message Schema
const MessageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  type: { type: String, default: 'chat' }, // 'chat' or 'system'
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// 3. Socket Setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

io.on('connection', async (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  // TASK 2.3: Load History on Join
  try {
    const history = await Message.find().sort({ timestamp: 1 }).limit(50);
    socket.emit('load_history', history);
  } catch (err) {
    console.error("Could not load history:", err);
  }

  socket.on('send_message', async (data) => {
    // TASK 2.4: ChatOps Logic (Basic Version)
    if (data.text.startsWith('/')) {
        handleCommand(socket, data);
        return; // Don't save commands to DB
    }

    // Normal Chat: Save to DB
    const newMessage = new Message(data);
    await newMessage.save();

    // Broadcast to everyone
    io.emit('receive_message', newMessage);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

// Helper for Commands
function handleCommand(socket, data) {
    const command = data.text.split(' ')[0]; // Get the first word

    if (command === '/status') {
        // Send a "System Message" only to the person who asked
        socket.emit('receive_message', {
            sender: 'OpsBot',
            text: '🟢 All Systems Operational. CPU: 12% | RAM: 4GB',
            type: 'system'
        });
    } else if (command === '/clear') {
       // We can implement clearing later
       socket.emit('receive_message', { sender: 'OpsBot', text: 'Clear command not implemented yet.', type: 'system' });
    } else {
        socket.emit('receive_message', { sender: 'OpsBot', text: `Unknown command: ${command}`, type: 'system' });
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});