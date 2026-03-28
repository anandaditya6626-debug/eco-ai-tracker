const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config();

const analysisRoutes = require('./routes/analysis');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/analysis', analysisRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize DB and Server
async function startServer() {
  try {
    let mongoUri = process.env.MONGO_URI;
    
    // If no URI is provided, use an in-memory MongoDB instance for a zero-setup experience
    if (!mongoUri) {
      console.log('⏳ Starting in-memory MongoDB Server (no local installation required)...');
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
    }

    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB (${process.env.MONGO_URI ? 'Local/Remote' : 'In-Memory'})`);
    
    app.listen(PORT, () => {
      console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
}

startServer();
