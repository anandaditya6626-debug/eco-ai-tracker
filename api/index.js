import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();

// ── Middleware ──
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://eco-ai.vercel.app',
    /\.vercel\.app$/,
  ],
  credentials: true,
}));
app.use(express.json());

// ── Gemini Native REST API ──
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(systemPrompt, chatMessages, retries = 3) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  // Convert chat messages to Gemini format with proper turn-taking
  const filtered = chatMessages
    .filter(msg => msg.content && msg.content.trim())
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

  // Merge consecutive messages with the same role
  const contents = [];
  for (const msg of filtered) {
    if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
      contents[contents.length - 1].parts[0].text += '\n' + msg.parts[0].text;
    } else {
      contents.push(msg);
    }
  }

  // Ensure conversation ends with a user message
  if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
    return null;
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    }

    if (response.status === 429 && attempt < retries) {
      let waitMs = Math.min(2000 * Math.pow(2, attempt), 30000);
      try {
        const errData = await response.json();
        const retryInfo = errData.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
        if (retryInfo?.retryDelay) {
          const seconds = parseInt(retryInfo.retryDelay);
          if (!isNaN(seconds)) waitMs = (seconds + 1) * 1000;
        }
      } catch { /* ignore */ }
      console.warn(`Gemini 429 — retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${retries})`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${errText.substring(0, 200)}`);
  }
  throw new Error('Gemini API: max retries exceeded');
}

// ── DB Connection ──
let isConnected = false;
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 10000 });
  isConnected = true;
}

// ── Schemas & Models ──
const userSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  email:          { type: String, required: true, unique: true, lowercase: true },
  passwordHash:   { type: String, required: true },
  ecoPoints:      { type: Number, default: 0 },
  streak:         { type: Number, default: 0 },
  lastActiveDate: { type: String, default: '' },
  badges:         { type: [String], default: [] },
  resetPasswordToken:  { type: String },
  resetPasswordExpire: { type: Date },
}, { timestamps: true });

const carbonSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  transport:   { type: String, enum: ['car','bike','bus','train','none'], default: 'none' },
  distance:    { type: Number, default: 0 },
  electricity: { type: Number, default: 0 },
  food:        { type: String, enum: ['veg','non-veg','mixed'], default: 'mixed' },
  totalCO2:    { type: Number, required: true },
  date:        { type: String, required: true },    // YYYY-MM-DD
}, { timestamps: true });

// Legacy prompt-optimizer schema
const analysisSchema = new mongoose.Schema({
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
}, { timestamps: true });

const User     = mongoose.models.User     || mongoose.model('User',     userSchema);
const Carbon   = mongoose.models.Carbon   || mongoose.model('Carbon',   carbonSchema);
const Analysis = mongoose.models.Analysis || mongoose.model('Analysis', analysisSchema);

// ── Auth Helpers ──
const JWT_SECRET = process.env.JWT_SECRET || 'ecoaitracker-dev-secret-2024';

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── CO₂ Calculation ──
const TRANSPORT_FACTORS = { car: 0.21, bus: 0.089, train: 0.041, bike: 0.0, none: 0.0 };
const FOOD_FACTORS      = { veg: 3.8, mixed: 5.5, 'non-veg': 7.19 };
const ELECTRICITY_FACTOR = 0.233; // kg CO₂ per kWh (world avg)

function calcCO2({ transport = 'none', distance = 0, electricity = 0, food = 'mixed' }) {
  const transportCO2   = (TRANSPORT_FACTORS[transport] || 0) * Number(distance);
  const electricityCO2 = ELECTRICITY_FACTOR * Number(electricity);
  const foodCO2        = FOOD_FACTORS[food] || 5.5;
  return parseFloat((transportCO2 + electricityCO2 + foodCO2).toFixed(3));
}

// ── Gamification ──
const BADGE_RULES = [
  { id: 'first_log',     label: '🌱 First Step',     desc: 'Logged your first carbon entry',    check: (pts) => pts >= 1  },
  { id: 'eco_warrior',   label: '⚡ Eco Warrior',    desc: 'Earned 100 eco points',              check: (pts) => pts >= 100 },
  { id: 'green_streak',  label: '🔥 Green Streak',   desc: 'Maintained a 7-day streak',          check: (_,s) => s >= 7    },
  { id: 'carbon_cutter', label: '✂️ Carbon Cutter',  desc: 'Logged entry under 5kg CO₂',        check: (_,__,co2) => co2 < 5 },
  { id: 'champion',      label: '🏆 Eco Champion',   desc: 'Earned 500 eco points',              check: (pts) => pts >= 500 },
];

function calcPoints(totalCO2) {
  if (totalCO2 < 3)  return 50;
  if (totalCO2 < 6)  return 30;
  if (totalCO2 < 10) return 15;
  return 5;
}

async function updateStreak(user, today) {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  if (user.lastActiveDate === today)     return;               // already counted
  if (user.lastActiveDate === yStr)      user.streak += 1;     // consecutive
  else                                   user.streak  = 1;     // reset
  user.lastActiveDate = today;
}

function updateBadges(user, lastCO2) {
  BADGE_RULES.forEach(rule => {
    if (!user.badges.includes(rule.id) && rule.check(user.ecoPoints, user.streak, lastCO2)) {
      user.badges.push(rule.id);
    }
  });
}

// ════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════

// Health
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Auth ──
app.post('/api/auth/register', async (req, res) => {
  try {
    await connectDB();
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const token = signToken(user._id);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, ecoPoints: 0, streak: 0, badges: [] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    await connectDB();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, ecoPoints: user.ecoPoints, streak: user.streak, badges: user.badges } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    await connectDB();
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'No user exists with this email' });

    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    res.json({ message: 'Simulated email sent!', resetToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    await connectDB();
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and password required' });

    const crypto = await import('crypto');
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Password updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, name: user.name, email: user.email, ecoPoints: user.ecoPoints, streak: user.streak, badges: user.badges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Carbon Logging ──
app.post('/api/carbon/log', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { transport, distance, electricity, food } = req.body;
    const today    = new Date().toISOString().split('T')[0];
    const totalCO2 = calcCO2({ transport, distance, electricity, food });

    const entry = await Carbon.create({ userId: req.userId, transport, distance: Number(distance), electricity: Number(electricity), food, totalCO2, date: today });

    // Update user gamification
    const user   = await User.findById(req.userId);
    const points = calcPoints(totalCO2);
    user.ecoPoints += points;
    await updateStreak(user, today);
    updateBadges(user, totalCO2);
    await user.save();

    res.status(201).json({ entry, pointsEarned: points, totalPoints: user.ecoPoints, streak: user.streak, badges: user.badges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/carbon/history', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const entries = await Carbon.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(60);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/carbon/stats', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const today   = new Date();
    const entries = await Carbon.find({ userId: req.userId }).sort({ date: 1 });

    // Group by date
    const byDate = {};
    entries.forEach(e => {
      byDate[e.date] = (byDate[e.date] || 0) + e.totalCO2;
    });

    // Last 7 days
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      last7.push({ date: key, co2: parseFloat((byDate[key] || 0).toFixed(2)) });
    }

    // Last 30 days
    const last30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      last30.push({ date: key, co2: parseFloat((byDate[key] || 0).toFixed(2)) });
    }

    const totalCO2  = entries.reduce((s, e) => s + e.totalCO2, 0);
    const todayKey  = today.toISOString().split('T')[0];
    const todayCO2  = byDate[todayKey] || 0;

    res.json({ last7, last30, totalCO2: parseFloat(totalCO2.toFixed(2)), todayCO2: parseFloat(todayCO2.toFixed(2)), entryCount: entries.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Gamification ──
app.get('/api/gamification/profile', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const user    = await User.findById(req.userId).select('-passwordHash');
    const entries = await Carbon.find({ userId: req.userId }).sort({ createdAt: -1 });
    const totalCO2Logged = entries.reduce((s, e) => s + e.totalCO2, 0);
    const avgDailyCO2    = entries.length > 0 ? totalCO2Logged / entries.length : 0;

    // Leaderboard rank (all users sorted by ecoPoints)
    const allUsers    = await User.find().select('name ecoPoints').sort({ ecoPoints: -1 }).limit(10);
    const leaderboard = allUsers.map((u, i) => ({ rank: i+1, name: u.name, points: u.ecoPoints }));

    const BADGE_META = BADGE_RULES.reduce((acc, b) => { acc[b.id] = { label: b.label, desc: b.desc }; return acc; }, {});

    res.json({
      ecoPoints:      user.ecoPoints,
      streak:         user.streak,
      badges:         user.badges.map(id => ({ id, ...(BADGE_META[id] || {}) })),
      allBadges:      BADGE_RULES.map(b => ({ id: b.id, label: b.label, desc: b.desc, earned: user.badges.includes(b.id) })),
      totalCO2Logged: parseFloat(totalCO2Logged.toFixed(2)),
      avgDailyCO2:    parseFloat(avgDailyCO2.toFixed(2)),
      entryCount:     entries.length,
      leaderboard,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Chat ──
app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    await connectDB();
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });

    // Get user's recent carbon data for context
    const recent  = await Carbon.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(7);
    const user    = await User.findById(req.userId).select('name ecoPoints streak');
    const avgCO2  = recent.length > 0 ? (recent.reduce((s,e) => s+e.totalCO2, 0) / recent.length).toFixed(2) : null;
    const todayEntry = recent.find(e => e.date === new Date().toISOString().split('T')[0]);

    const systemPrompt = `You are Eco AI Tracker AI, a friendly and encouraging personal eco-assistant integrated into the Eco AI Tracker sustainability platform.

User context:
- Name: ${user?.name || 'User'}
- Eco Points: ${user?.ecoPoints || 0}
- Current streak: ${user?.streak || 0} days
${avgCO2 ? `- Average daily CO₂ (last 7 days): ${avgCO2} kg` : '- No carbon data logged yet'}
${todayEntry ? `- Today's CO₂: ${todayEntry.totalCO2} kg` : '- No entry logged today'}

Your role:
- Give personalized, actionable advice based on their carbon data
- Be concise, friendly, and motivating
- Use emojis to make responses engaging
- Reference their actual data when relevant
- Suggest specific actions to reduce their footprint
- Celebrate their achievements (streaks, points, low emissions)
- Keep responses to 2-4 sentences unless asked for more detail`;

    let botReply = '';

    if (!process.env.GEMINI_API_KEY) {
      console.warn('No Gemini API Key found. Using Demo Mode.');
      botReply = getMockResponse();
    } else {
      try {
        const result = await callGemini(systemPrompt, messages.slice(-10), 3);
        if (result) { botReply = result; }
        else { throw new Error('Invalid message format'); }
      } catch (err) {
        console.warn('Gemini API Failed (' + err.message + '). Falling back to Demo Mode.');
        botReply = getMockResponse();
      }
    }

    function getMockResponse() {
      const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
      let response = `Hi ${user?.name || 'there'}! 🌱 I'm currently running in **Demo Mode** (Gemini temporarily unavailable). `;
      if (lastMsg.includes('tip') || lastMsg.includes('suggest') || lastMsg.includes('help'))
        response += `Based on your recent activity, try switching to public transport for your commute — it can cut your transport emissions by 60%! 🚌`;
      else if (lastMsg.includes('carbon') || lastMsg.includes('co2'))
        response += avgCO2 ? `Your average daily CO₂ is ${avgCO2}kg. The global average is 12kg/day, so you're ${Number(avgCO2) < 12 ? 'doing great!' : 'have room to improve!'} 🌍` : `Start logging your carbon footprint to get personalized insights! 📊`;
      else if (lastMsg.includes('streak') || lastMsg.includes('point'))
        response += `You have a ${user?.streak || 0}-day streak and ${user?.ecoPoints || 0} eco points — keep it up! 🔥`;
      else
        response += `Ask me for eco tips, explain your carbon data, or get suggestions to reduce your footprint! 🌿`;
      return response;
    }

    res.json({ role: 'assistant', content: botReply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'AI service error' });
  }
});

// ── Legacy Prompt Analyzer (kept intact) ──
const FILLER_WORDS = new Set(['please','just','really','very','actually','basically','simply','literally','maybe','perhaps','think','want','need','can','could','would','like','um','uh','well','so','that','the','a','an','it','is','are','was','were','be','been','being','have','has','had','do','does','did','will','shall','should','may','might','must','of','in','to','for','with','on','at','from','by','about','as','into','through','during','before','after','above','below','between','too','also','then','than','but','or','nor','not','no','if','when']);

function optimizePrompt(text) {
  const words  = text.trim().split(/\s+/).filter(Boolean);
  const kept   = words.filter(w => !FILLER_WORDS.has(w.toLowerCase().replace(/[.,!?;:'"]/g, '')));
  const target = Math.max(Math.ceil(words.length * 0.6), 3);
  const result = kept.slice(0, target);
  return result.length > 0 ? result.join(' ') : words.slice(0, target).join(' ');
}

const WPW = 0.35, EPW = 0.012, CPW = 0.008;

app.get('/api/analysis/history', async (_req, res) => {
  try { await connectDB(); res.json(await Analysis.find().sort({ createdAt: -1 }).limit(20).select('-__v')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/analysis/stats', async (_req, res) => {
  try {
    await connectDB();
    const s = await Analysis.aggregate([{ $group: { _id: null, totalWaterSaved: { $sum: '$waterSaved' }, totalEnergySaved: { $sum: '$energySaved' }, totalCO2Saved: { $sum: '$co2Saved' }, totalAnalyses: { $sum: 1 } } }]);
    res.json(s[0] || { totalWaterSaved: 0, totalEnergySaved: 0, totalCO2Saved: 0, totalAnalyses: 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/analysis', async (req, res) => {
  try {
    await connectDB();
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt required' });
    const text = prompt.trim(), words = text.split(/\s+/).filter(Boolean), wc = words.length;
    const wu = parseFloat((wc*WPW).toFixed(3)), eu = parseFloat((wc*EPW).toFixed(4)), co2 = parseFloat((wc*CPW).toFixed(4));
    const opt = optimizePrompt(text), ow = opt.split(/\s+/).filter(Boolean).length;
    const ow2 = parseFloat((ow*WPW).toFixed(3)), oe = parseFloat((ow*EPW).toFixed(4)), oc = parseFloat((ow*CPW).toFixed(4));
    const score = Math.min(100, Math.round((1-(wc-ow)/Math.max(wc,1))*80 + (wc<=10?20:wc<=25?12:5)));
    const doc = await Analysis.create({ originalPrompt:text, optimizedPrompt:opt, wordCount:wc, optimizedWordCount:ow, waterUsage:wu, energyUsage:eu, co2Emissions:co2, waterSaved:parseFloat((wu-ow2).toFixed(3)), energySaved:parseFloat((eu-oe).toFixed(4)), co2Saved:parseFloat((co2-oc).toFixed(4)), ecoScore:score });
    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/analysis/:id', async (req, res) => {
  try { await connectDB(); await Analysis.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default app;
