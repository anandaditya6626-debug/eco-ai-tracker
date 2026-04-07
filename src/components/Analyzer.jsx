import { useState, useEffect } from 'react'

const TIPS = [
  "Shorter prompts reduce energy usage and improve efficiency.",
  "Combining multiple questions into one prompt saves resources.",
  "Clear, specific prompts reduce the need for follow-up queries.",
  "Using keywords instead of full sentences can cut energy use by 30%.",
  "Every optimized prompt helps conserve water used in data center cooling.",
  "Batch your AI queries instead of sending them one at a time.",
  "Well-structured prompts lead to faster, more energy-efficient responses."
]

export default function Analyzer({ onNewAnalysis }) {
  const [prompt, setPrompt] = useState('')
  const [charInfo, setCharInfo] = useState('0 chars · 0 words')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')

  useEffect(() => { fetchHistory() }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/analysis/history')
      if (res.ok) setHistory(await res.json())
    } catch (e) { /* ignore if server not ready */ }
  }

  const handleInput = (val) => {
    setPrompt(val)
    const words = val.trim().split(/\s+/).filter(Boolean).length
    setCharInfo(`${val.length} chars · ${words} words`)
  }

  const analyze = async () => {
    if (!prompt.trim()) { setError('Please enter a prompt'); setTimeout(() => setError(''), 2000); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      })
      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setResult({ ...data, tip: TIPS[Math.floor(Math.random() * TIPS.length)] })
      fetchHistory()
      if (onNewAnalysis) onNewAnalysis()
    } catch (e) {
      setError('Failed to analyze. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  const circumference = 2 * Math.PI * 33
  const scoreOffset = result ? circumference - (result.ecoScore / 100) * circumference : circumference

  return (
    <section className="analyzer" id="analyzer">
      <div className="section-header fade-in">
        <div className="section-tag">Prompt Analyzer</div>
        <h2>Analyze Your Prompt's Footprint</h2>
        <p>Paste your AI prompt below and discover its environmental cost — plus get an optimized version.</p>
      </div>

      <div className="analyzer-grid">
        {/* Input Panel */}
        <div className="glass-card input-panel fade-in">
          <h3>📝 Your Prompt</h3>
          <textarea
            id="prompt-input"
            placeholder={"Type or paste your AI prompt here...\n\nExample: Can you please help me write a very detailed and comprehensive essay about the environmental impact of artificial intelligence on our planet?"}
            value={prompt}
            onChange={(e) => handleInput(e.target.value)}
            style={error ? { borderColor: '#ff4444' } : {}}
          />
          <div className="char-count">{charInfo}</div>
          {error && <div style={{ color: '#ff4444', fontSize: '0.82rem', marginTop: 6 }}>{error}</div>}
          <button className="analyze-btn" id="analyze-btn" onClick={analyze} disabled={loading}>
            <span className="btn-shimmer"></span>
            {loading ? '⏳ Analyzing...' : '⚡ Analyze Impact'}
          </button>

          {/* History */}
          {history.length > 0 && (
            <div className="history-section" style={{ marginTop: 24 }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--neon-blue)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                📜 Recent Analyses
              </h4>
              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.slice(0, 8).map((h) => (
                  <div
                    key={h._id}
                    className="history-item"
                    onClick={() => { setPrompt(h.originalPrompt); handleInput(h.originalPrompt); setResult({ ...h, tip: TIPS[Math.floor(Math.random() * TIPS.length)] }) }}
                    style={{
                      padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                      background: 'rgba(0,200,255,0.05)', border: '1px solid rgba(0,200,255,0.1)',
                      fontSize: '0.78rem', color: 'var(--text-secondary)', transition: 'var(--transition)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      {h.originalPrompt}
                    </span>
                    <span style={{ color: 'var(--neon-green)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: '0.75rem' }}>
                      {h.ecoScore}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="glass-card results-panel fade-in">
          {!result ? (
            <div className="results-placeholder">
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 14v-4m0-4h.01" />
              </svg>
              <p>Enter a prompt and click<br /><strong>Analyze Impact</strong> to see results</p>
            </div>
          ) : (
            <div id="results" style={{ animation: 'fadeInUp 0.5s ease' }}>
              {/* Eco Score + Meta */}
              <div className="result-header">
                <div className="eco-score-ring">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="33" fill="none" stroke="rgba(0,255,136,0.1)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="33" fill="none" stroke="#00ff88" strokeWidth="6"
                      strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={scoreOffset}
                      style={{ transition: 'stroke-dashoffset 1s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                  </svg>
                  <div className="score-text">
                    <span className="score-val">{result.ecoScore}</span>
                    <span className="score-label">ECO SCORE</span>
                  </div>
                </div>
                <div className="result-meta">
                  <div className="word-count">Original: <span>{result.wordCount}</span> words</div>
                  <div className="word-count">Optimized: <span>{result.optimizedWordCount}</span> words</div>
                </div>
              </div>

              {/* Metrics */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">💧</div>
                  <div className="metric-val">{result.waterUsage} ml</div>
                  <div className="metric-label">Water Usage</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">⚡</div>
                  <div className="metric-val">{result.energyUsage} Wh</div>
                  <div className="metric-label">Energy Usage</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">🌫️</div>
                  <div className="metric-val">{result.co2Emissions} g</div>
                  <div className="metric-label">CO₂ Emissions</div>
                </div>
              </div>

              {/* Savings */}
              <div className="savings-section">
                <h4>✅ Savings After Optimization</h4>
                <div className="savings-grid">
                  <div className="saving-item">
                    <div className="saved-val">-{result.waterSaved} ml</div>
                    <div className="saved-label">Water Saved</div>
                  </div>
                  <div className="saving-item">
                    <div className="saved-val">-{result.energySaved} Wh</div>
                    <div className="saved-label">Energy Saved</div>
                  </div>
                  <div className="saving-item">
                    <div className="saved-val">-{result.co2Saved} g</div>
                    <div className="saved-label">CO₂ Reduced</div>
                  </div>
                </div>
              </div>

              {/* Optimized Prompt */}
              <div className="optimized-prompt">
                <h4>🔧 Optimized Prompt</h4>
                <p>{result.optimizedPrompt}</p>
              </div>

              {/* Eco Tip */}
              <div className="eco-tip">
                <strong>💡 Tip:</strong> {result.tip}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
