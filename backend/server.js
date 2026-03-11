const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const k8s = require('@kubernetes/client-node');
const fs = require('fs');         // <-- Add this
const path = require('path');     // <-- Add this

// Configure Kubernetes client for both in-cluster and local development.
const kc = new k8s.KubeConfig();
const hasInClusterEnv = Boolean(process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT);

if (hasInClusterEnv) {
  kc.loadFromCluster();
  console.log('☸️  Kubernetes config: in-cluster');
} else {
  try {
    kc.loadFromDefault();
    console.log('☸️  Kubernetes config: local kubeconfig');
  } catch (err) {
    console.error('❌ Failed to load local kubeconfig for Kubernetes client:', err.message);
  }
}

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sObjectApi = k8s.KubernetesObjectApi.makeApiClient(kc);

const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const PORT = 4000;

app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://opscommand.local'
    ]
}));
app.use(express.json());

// Auth API routes
app.use('/api/auth', authRoutes);

// 1. Connect to MongoDB with retry logic
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/opscommand';

const connectWithRetry = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('✅ Connected to MongoDB');
      return;
    } catch (err) {
      console.log(`⏳ MongoDB connection attempt ${i + 1}/${retries} failed, retrying in ${delay/1000}s...`);
      if (i === retries - 1) {
        console.error('❌ MongoDB Connection Error:', err);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

connectWithRetry();

// 2. Define the Message Schema
const MessageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  type: { type: String, default: 'chat' }, // 'chat' or 'system'
  channel: { type: String, default: 'chat' }, // 'chat' or 'ops'
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

  // Load chat history (team messages)
  try {
    const chatHistory = await Message.find({ channel: 'chat' }).sort({ timestamp: 1 }).limit(50);
    socket.emit('load_chat_history', chatHistory);
  } catch (err) {
    console.error("Could not load chat history:", err);
  }

  // Load ops history (command logs)
  try {
    const opsHistory = await Message.find({ channel: 'ops' }).sort({ timestamp: 1 }).limit(50);
    socket.emit('load_ops_history', opsHistory);
  } catch (err) {
    console.error("Could not load ops history:", err);
  }

  // --- Team chat messages (left panel) ---
  socket.on('team-message', async (data) => {
    const newMessage = new Message({
      sender: data.sender,
      text: data.text,
      type: 'chat',
      channel: 'chat',
    });
    await newMessage.save();
    io.emit('team-message', newMessage);
  });

  // --- Ops commands (right panel) ---
  socket.on('ops-command', async (data) => {
    // Echo the command input to the ops log for all clients
    const echoMsg = new Message({
      sender: data.sender,
      text: data.text,
      type: 'system',
      channel: 'ops',
    });
    await echoMsg.save();
    io.emit('ops-log', echoMsg);

    // Notify all clients who executed the command
    const executionNotification = new Message({
      sender: 'OpsBot',
      text: `${data.sender} executed ${data.text} command`,
      type: 'system',
      channel: 'ops',
    });
    await executionNotification.save();
    io.emit('ops-log', executionNotification);

    // Execute the command
    handleCommand(socket, data);
  });

  // --- Legacy: keep backward compat for any old clients ---
  socket.on('send_message', async (data) => {
    if (data.text.startsWith('/')) {
        handleCommand(socket, data);
        return;
    }
    const newMessage = new Message(data);
    await newMessage.save();
    io.emit('receive_message', newMessage);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

// Helper for Commands
async function handleCommand(socket, data) {
    const commandName = data.text.split(' ')[0]; // Extract the command (e.g., "/status")

    // Create an ops-aware context that emits to 'ops-log' instead of 'receive_message'
    const opsSocket = {
      emit: (event, payload) => {
        if (event === 'receive_message') {
          // Redirect to ops-log and persist
          const opsMsg = { ...payload, channel: 'ops' };
          new Message(opsMsg).save().catch(err => console.error('Failed to save ops msg:', err));
          io.emit('ops-log', opsMsg);
        } else {
          socket.emit(event, payload);
        }
      },
      id: socket.id,
    };

    // Check if the command exists in our Map
    if (commands.has(commandName)) {
        const command = commands.get(commandName);
        // Execute the command, passing the data and our ops-aware context
        await command.execute(data, { socket: opsSocket, io, k8sApi, k8sAppsApi, k8sObjectApi, commands });
    } else {
        const errorMsg = { sender: 'OpsBot', text: `Unknown command: ${commandName}.`, type: 'system', channel: 'ops' };
        new Message(errorMsg).save().catch(err => console.error('Failed to save ops msg:', err));
        io.emit('ops-log', errorMsg);
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});