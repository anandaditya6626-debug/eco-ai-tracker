const express = require('express');
const router = express.Router();

// ── Gemini Native REST API Helper ──
// Uses the native Gemini API directly (no OpenAI compatibility layer)
// for better free-tier reliability and proper error handling.

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Call the Gemini API with automatic retry + exponential backoff for 429 errors.
 * Free-tier keys have per-minute rate limits, so we wait and retry.
 */
async function callGemini(systemPrompt, chatMessages, retries = 3) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  // Convert chat messages to Gemini format with proper turn-taking
  // Gemini requires: alternating user/model roles, must end with user
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
    return null; // Signal to use fallback
  }

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 400,
    },
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

    // Handle rate limits with retry
    if (response.status === 429 && attempt < retries) {
      // Parse retry delay from response, default to exponential backoff
      let waitMs = Math.min(2000 * Math.pow(2, attempt), 30000); // 2s, 4s, 8s...
      try {
        const errData = await response.json();
        const retryInfo = errData.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
        if (retryInfo?.retryDelay) {
          const seconds = parseInt(retryInfo.retryDelay);
          if (!isNaN(seconds)) waitMs = (seconds + 1) * 1000;
        }
      } catch { /* ignore parse errors */ }

      console.warn(`Gemini 429 rate limit — retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${retries})`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    // Non-retryable error
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${errText.substring(0, 200)}`);
  }

  throw new Error('Gemini API: max retries exceeded (rate limited)');
}

// ── Chat Route ──
router.post('/', async (req, res) => {
  try {
    const { messages, context } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API key missing. Please add GEMINI_API_KEY to your .env file.' 
      });
    }

    const { name, ecoPoints, streak, badgesCount, avgCO2 } = context || {};

    const systemPrompt = `You are the Eco AI Assistant for the "Eco AI Tracker" app. Your name is EcoBuddy.
Your goal is to help users reduce their carbon footprint with friendly, actionable, and personalized advice.

User Context:
- Name: ${name || 'User'}
- Current Eco Points: ${ecoPoints || 0}
- Daily Streak: ${streak || 0} days
- Badges Earned: ${badgesCount || 0}
- Average Daily CO2: ${avgCO2 || 'N/A'} kg (The global sustainable target is ~5kg/day).

Instructions:
1. Be encouraging and positive.
2. Use the user's data to make your advice specific (e.g., if their average CO2 is high, suggest specific transport or food changes).
3. If they ask about badges or points, explain how they can earn more by logging activities.
4. Keep responses concise (2-4 sentences) but helpful.
5. Use eco-friendly emojis 🌿🌱🌍.`;

    let botReply = '';

    try {
      const result = await callGemini(systemPrompt, messages, 3);
      if (result) {
        botReply = result;
      } else {
        throw new Error('Invalid message format for Gemini');
      }
    } catch (apiError) {
      console.warn('Gemini API Failed (Fallback to Mock Mode):', apiError.message);
      
      // Smart Mock Mode Fallback
      const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
      botReply = `Hi ${name || 'there'}! 🌱 I'm currently running in **Demo Mode** (Gemini temporarily unavailable). `;
      
      if (lastMsg.includes('tip') || lastMsg.includes('suggest') || lastMsg.includes('help')) {
        botReply += `But based on your data, try switching to public transport for your commute — it can cut your transport emissions by 60%! 🚌`;
      } else if (lastMsg.includes('carbon') || lastMsg.includes('co2')) {
        botReply += avgCO2 && Number(avgCO2) > 0 ? `Your average daily CO₂ is ${avgCO2}kg. The global target is ~5kg/day, so let's try to lower it! 🌍` : `Start logging your carbon footprint to get personalized insights! 📊`;
      } else if (lastMsg.includes('streak') || lastMsg.includes('point') || lastMsg.includes('badges')) {
        botReply += `You have a ${streak || 0}-day streak, ${badgesCount || 0} badges, and ${ecoPoints || 0} eco points — keep up the fantastic work! 🔥`;
      } else {
        botReply += `Ask me for eco tips, explain your carbon data, or get suggestions to reduce your footprint! 🌿`;
      }
    }

    const botMessage = {
      role: 'assistant',
      content: botReply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    res.json(botMessage);
  } catch (err) {
    console.error('Chat Route Critical Error:', err);
    res.status(500).json({ error: 'Failed to process chat request.' });
  }
});

module.exports = router;
