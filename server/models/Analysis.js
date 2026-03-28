const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  originalPrompt: { type: String, required: true },
  optimizedPrompt: { type: String, required: true },
  wordCount: { type: Number, required: true },
  optimizedWordCount: { type: Number, required: true },
  waterUsage: { type: Number, required: true },
  energyUsage: { type: Number, required: true },
  co2Emissions: { type: Number, required: true },
  waterSaved: { type: Number, required: true },
  energySaved: { type: Number, required: true },
  co2Saved: { type: Number, required: true },
  ecoScore: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Analysis', analysisSchema);
