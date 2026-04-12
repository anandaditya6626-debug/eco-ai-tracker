const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createServer } = require('http');
const { Server } = require('socket.io');
// Load .env from the root project folder (one level up from /server)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const analysisRoutes = require('./routes/analysis');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

// Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/chat', chatRoutes);

io.on('connection', (socket) => {
  console.log('🔌 Client connected to WebSocket');
  
  socket.on('new-entry', (data) => {
    console.log('📡 Received new entry, broadcasting...', data);
    io.emit('entry-broadcast', data);
  });

  socket.on('disconnect', () => console.log('🔌 Client disconnected'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize DB and Server
async function startServer() {
  try {
    let mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.log('⏳ Starting in-memory MongoDB Server...');
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
    }

    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB`);
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Backend Server + WebSocket running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
}

startServer();
