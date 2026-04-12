import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import LiveTracker from '../components/LiveTracker'

const TRANSPORT_OPTS = [
  { value: 'none',  label: 'None / Walk',    icon: '🚶', factor: 0 },
  { value: 'bike',  label: 'Bicycle',         icon: '🚲', factor: 0 },
  { value: 'bus',   label: 'Bus',             icon: '🚌', factor: 0.089 },
  { value: 'train', label: 'Train',           icon: '🚆', factor: 0.041 },
  { value: 'car',   label: 'Car',             icon: '🚗', factor: 0.21  },
]

const FOOD_OPTS = [
  { value: 'veg',     label: 'Vegetarian',   icon: '🥗', co2: 3.8  },
  { value: 'mixed',   label: 'Mixed Diet',   icon: '🍽️', co2: 5.5  },
  { value: 'non-veg', label: 'Meat-heavy',   icon: '🥩', co2: 7.19 },
]

const ELECTRICITY_FACTOR = 0.233

function calcLiveCO2({ transport, distance, electricity, food }) {
  const t = TRANSPORT_OPTS.find(o => o.value === transport)?.factor ?? 0
  const f = FOOD_OPTS.find(o => o.value === food)?.co2 ?? 5.5
  return parseFloat(((t * Number(distance)) + (ELECTRICITY_FACTOR * Number(electricity)) + f).toFixed(2))
}

export default function Calculator() {
  const { addEntry } = useData()
  const navigate = useNavigate()

  const [form, setForm] = useState({ transport: 'none', distance: '', electricity: '', food: 'mixed' })
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)

  const liveCO2 = calcLiveCO2({ ...form, distance: form.distance || 0, electricity: form.electricity || 0 })

  const handleChange = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setSaved(false); setResult(null)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = addEntry({
        transport: form.transport,
        distance: form.distance,
        electricity: form.electricity,
        food: form.food,
        co2: liveCO2
      })
      setResult(data)
      setSaved(true)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const treesEq   = (liveCO2 / 21.77).toFixed(3)
  const kmEq      = (liveCO2 / 0.21).toFixed(1)
  const impactLvl = liveCO2 < 5 ? 'Low 🟢' : liveCO2 < 10 ? 'Moderate 🟡' : 'High 🔴'
  const impactClr = liveCO2 < 5 ? '#00ff88' : liveCO2 < 10 ? '#ffd700' : '#ff4d4d'

  return (
    <div className="page calculator">
      <div className="page-header">
        <div>
          <h1>🧮 Carbon Calculator</h1>
          <p className="page-sub">Log your daily activities and calculate your CO₂ footprint.</p>
        </div>
      </div>

      <div className="calc-grid">
        {/* ── Form ── */}
        <form className="calc-form glass-card" onSubmit={handleSubmit}>
          <h2>Today's Activities</h2>

          {/* Transport */}
          <div className="form-section">
            <label className="form-label">🚌 Transport Type</label>
            <div className="option-grid">
              {TRANSPORT_OPTS.map(o => (
                <button type="button" key={o.value}
                  className={`option-btn ${form.transport === o.value ? 'selected' : ''}`}
                  onClick={() => handleChange('transport', o.value)}>
                  <span className="opt-icon">{o.icon}</span>
                  <span className="opt-label">{o.label}</span>
                </button>
              ))}
            </div>
          </div>

          {form.transport !== 'none' && (
            <div className="form-section">
              <label className="form-label">📍 Distance (km)</label>
              <input type="number" className="calc-input" min="0" max="10000" step="0.1"
                placeholder="e.g. 25" value={form.distance}
                onChange={e => handleChange('distance', e.target.value)} />
            </div>
          )}

          {/* Electricity */}
          <div className="form-section">
            <label className="form-label">⚡ Electricity Usage (kWh)</label>
            <input type="number" className="calc-input" min="0" max="1000" step="0.1"
              placeholder="e.g. 8.5 — check your meter or estimate" value={form.electricity}
              onChange={e => handleChange('electricity', e.target.value)} />
            <span className="form-hint">Average household: 10–30 kWh/day</span>
          </div>

          {/* Food */}
          <div className="form-section">
            <label className="form-label">🍽️ Food Habits Today</label>
            <div className="option-grid food-grid">
              {FOOD_OPTS.map(o => (
                <button type="button" key={o.value}
                  className={`option-btn ${form.food === o.value ? 'selected' : ''}`}
                  onClick={() => handleChange('food', o.value)}>
                  <span className="opt-icon">{o.icon}</span>
                  <span className="opt-label">{o.label}</span>
                  <span className="opt-sub">{o.co2} kg/day</span>
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary calc-submit" disabled={loading || saved}>
            {loading ? <span className="btn-spinner" /> : null}
            {saved ? '✅ Saved!' : loading ? 'Calculating…' : '💾 Save & Calculate'}
          </button>

          {saved && (
            <div className="saved-actions">
              <button type="button" className="btn-ghost" onClick={() => { setForm({ transport:'none', distance:'', electricity:'', food:'mixed' }); setSaved(false); setResult(null) }}>
                + Log Another
              </button>
              <button type="button" className="btn-primary" onClick={() => navigate('/dashboard')}>
                View Dashboard →
              </button>
            </div>
          )}
        </form>

        {/* ── Live Preview ── */}
        <div className="calc-preview">
          <div className="preview-card glass-card">
            <h2>Live Estimate</h2>
            <div className="co2-display">
              <div className="co2-big" style={{ color: impactClr }}>{liveCO2}</div>
              <div className="co2-unit">kg CO₂</div>
              <div className="co2-level" style={{ color: impactClr }}>{impactLvl}</div>
            </div>

            <div className="equiv-grid">
              <div className="equiv-item">
                <span className="equiv-icon">🌳</span>
                <span className="equiv-val">{treesEq}</span>
                <span className="equiv-label">trees for 1 day</span>
              </div>
              <div className="equiv-item">
                <span className="equiv-icon">🚗</span>
                <span className="equiv-val">{kmEq}</span>
                <span className="equiv-label">km by car</span>
              </div>
            </div>

            <div className="breakdown-list">
              <h3>Breakdown</h3>
              {form.transport !== 'none' && (
                <div className="breakdown-row">
                  <span>🚌 Transport</span>
                  <span>{((TRANSPORT_OPTS.find(o=>o.value===form.transport)?.factor??0) * (Number(form.distance)||0)).toFixed(2)} kg</span>
                </div>
              )}
              <div className="breakdown-row">
                <span>⚡ Electricity</span>
                <span>{(ELECTRICITY_FACTOR * (Number(form.electricity)||0)).toFixed(2)} kg</span>
              </div>
              <div className="breakdown-row">
                <span>🍽️ Food</span>
                <span>{FOOD_OPTS.find(o=>o.value===form.food)?.co2 ?? 5.5} kg</span>
              </div>
              <div className="breakdown-row total">
                <span>Total</span>
                <span style={{color: impactClr}}>{liveCO2} kg</span>
              </div>
            </div>
          </div>

          {result && (
            <div className="points-toast glass-card">
              <div className="toast-icon">🎉</div>
              <div>
                <strong>+{result.pointsEarned} Eco Points earned!</strong>
                <p>Total: {result.totalPoints} pts · Streak: {result.streak}🔥</p>
              </div>
            </div>
          )}

          <div className="eco-tip-card glass-card">
            <h3>💡 Quick Eco Tip</h3>
            <p>
              {liveCO2 < 3 ? "Amazing! You're well below average. Keep it up! 🌱" :
               liveCO2 < 7 ? "Good effort! Try switching one car trip to public transit to reduce further. 🚌" :
               "Try reducing meat consumption or taking the bus tomorrow — it makes a big difference! 🥗"}
            </p>
          </div>

          <LiveTracker form={form} liveCO2={liveCO2} />
        </div>
      </div>
    </div>
  )
}
