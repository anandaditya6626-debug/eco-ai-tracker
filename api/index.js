import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();

// ── Middleware ──
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://eco-ai-tracker.vercel.app',
    /\.vercel\.app$/,
  ],
  credentials: true,
}));
app.use(express.json());

// ── Mongoose Schema & Model (safe for serverless hot-reload) ──
const analysisSchema = new mongoose.Schema(
  {
    originalPrompt:     { type: String, required: true },
    optimizedPrompt:    { type: String, required: true },
    wordCount:          { type: Number, required: true },
    optimizedWordCount: { type: Number, required: true },
    waterUsage:         { type: Number, required: true },
    energyUsage:        { type: Number, required: true },
    co2Emissions:       { type: Number, required: true },
    waterSaved:         { type: Number, required: true },
    energySaved:        { type: Number, required: true },
    co2Saved:           { type: Number, required: true },
    ecoScore:           { type: Number, required: true },
  },
  { timestamps: true }
);

// Guard against Mongoose model re-registration in serverless warm starts
const Analysis =
  mongoose.models.Analysis || mongoose.model('Analysis', analysisSchema);

// ── Cached DB connection (reused across serverless invocations) ──
let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error(
      'MONGO_URI environment variable is not set. ' +
      'Add it in your Vercel project → Settings → Environment Variables.'
    );
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });
  isConnected = true;
  console.log('✅ MongoDB connected');
}

// ── Optimization Logic ──
const FILLER_WORDS = new Set([
  'please','just','really','very','actually','basically','simply',
  'literally','maybe','perhaps','think','want','need','can','could',
  'would','like','um','uh','well','so','that','the','a','an','it',
  'is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','shall','should','may','might','must',
  'of','in','to','for','with','on','at','from','by','about','as',
  'into','through','during','before','after','above','below','between',
  'too','also','then','than','but','or','nor','not','no','if','when',
]);

function optimizePrompt(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const kept = words.filter(
    (w) => !FILLER_WORDS.has(w.toLowerCase().replace(/[.,!?;:'"]/g, ''))
  );
  const targetLen = Math.max(Math.ceil(words.length * 0.6), 3);
  const result = kept.slice(0, targetLen);
  return result.length > 0
    ? result.join(' ')
    : words.slice(0, targetLen).join(' ');
}

const WATER_PER_WORD  = 0.35;
const ENERGY_PER_WORD = 0.012;
const CO2_PER_WORD    = 0.008;

// ── Health check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── POST /api/analysis ──
app.post('/api/analysis', async (req, res) => {
  try {
    await connectDB();

    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const text      = prompt.trim();
    const words     = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const waterUsage   = parseFloat((wordCount * WATER_PER_WORD).toFixed(3));
    const energyUsage  = parseFloat((wordCount * ENERGY_PER_WORD).toFixed(4));
    const co2Emissions = parseFloat((wordCount * CO2_PER_WORD).toFixed(4));

    const optimized = optimizePrompt(text);
    const optWords  = optimized.split(/\s+/).filter(Boolean).length;

    const optWater  = parseFloat((optWords * WATER_PER_WORD).toFixed(3));
    const optEnergy = parseFloat((optWords * ENERGY_PER_WORD).toFixed(4));
    const optCO2    = parseFloat((optWords * CO2_PER_WORD).toFixed(4));

    const waterSaved  = parseFloat((waterUsage  - optWater).toFixed(3));
    const energySaved = parseFloat((energyUsage - optEnergy).toFixed(4));
    const co2Saved    = parseFloat((co2Emissions - optCO2).toFixed(4));

    const ecoScore = Math.min(
      100,
      Math.round(
        (1 - (wordCount - optWords) / Math.max(wordCount, 1)) * 80 +
        (wordCount <= 10 ? 20 : wordCount <= 25 ? 12 : 5)
      )
    );

    const analysis = await Analysis.create({
      originalPrompt: text,
      optimizedPrompt: optimized,
      wordCount,
      optimizedWordCount: optWords,
      waterUsage,
      energyUsage,
      co2Emissions,
      waterSaved,
      energySaved,
      co2Saved,
      ecoScore,
    });

    res.status(201).json(analysis);
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── GET /api/analysis/history ──
app.get('/api/analysis/history', async (_req, res) => {
  try {
    await connectDB();
    const history = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-__v');
    res.json(history);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── GET /api/analysis/stats ──
app.get('/api/analysis/stats', async (_req, res) => {
  try {
    await connectDB();
    const stats = await Analysis.aggregate([
      {
        $group: {
          _id: null,
          totalWaterSaved:  { $sum: '$waterSaved'  },
          totalEnergySaved: { $sum: '$energySaved' },
          totalCO2Saved:    { $sum: '$co2Saved'    },
          totalAnalyses:    { $sum: 1              },
        },
      },
    ]);
    res.json(
      stats[0] || {
        totalWaterSaved: 0,
        totalEnergySaved: 0,
        totalCO2Saved: 0,
        totalAnalyses: 0,
      }
    );
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── DELETE /api/analysis/:id ──
app.delete('/api/analysis/:id', async (req, res) => {
  try {
    await connectDB();
    await Analysis.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default app;
