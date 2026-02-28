const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const k8s = require('@kubernetes/client-node');
const fs = require('fs');         // <-- Add this
const path = require('path');     // <-- Add this

// Configure the client to use the ServiceAccount injected into the Pod
const kc = new k8s.KubeConfig();
kc.loadFromCluster(); 
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

const app = express();
const server = http.createServer(app);
const PORT = 4000;

app.use(cors({
    origin: ["http://localhost:5173", "http://opscommand.local"]
}));
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
    origin: ["http://localhost:5173", "http://opscommand.local"],
    methods: ["GET", "POST"]
  }
});

// --- DYNAMIC COMMAND LOADER ---
const commands = new Map();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.set(command.name, command);
    console.log(`[OpsBot] Loaded command: ${command.name}`);
}
// ------------------------------

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
async function handleCommand(socket, data) {
    const commandName = data.text.split(' ')[0]; // Extract the command (e.g., "/status")

    // Check if the command exists in our Map
    if (commands.has(commandName)) {
        const command = commands.get(commandName);
        // Execute the command, passing the data and our context tools
        await command.execute(data, { socket, io, k8sApi, commands });
    } else {
        // Fallback for unknown commands
        socket.emit('receive_message', { 
            sender: 'OpsBot', 
            text: `Unknown command: ${commandName}.`, 
            type: 'system' 
        });
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});