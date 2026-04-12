import { useState } from 'react'
import { useData } from '../context/DataContext'

const TRANSPORT_OPTS = [
  { value: 'none',  label: 'Walk',    icon: '🚶', factor: 0 },
  { value: 'bike',  label: 'Bike',    icon: '🚲', factor: 0 },
  { value: 'bus',   label: 'Bus',     icon: '🚌', factor: 0.089 },
  { value: 'car',   label: 'Car',     icon: '🚗', factor: 0.21  },
]

const FOOD_OPTS = [
  { value: 'veg',     label: 'Veg',      icon: '🥗', co2: 3.8  },
  { value: 'mixed',   label: 'Mixed',    icon: '🍽️', co2: 5.5  },
  { value: 'non-veg', label: 'Meat',     icon: '🥩', co2: 7.19 },
]

const ELECTRICITY_FACTOR = 0.233

function calcLiveCO2({ transport, distance, electricity, food }) {
  const t = TRANSPORT_OPTS.find(o => o.value === transport)?.factor ?? 0
  const f = FOOD_OPTS.find(o => o.value === food)?.co2 ?? 5.5
  return parseFloat(((t * Number(distance)) + (ELECTRICITY_FACTOR * Number(electricity)) + f).toFixed(2))
}

export default function LogModal({ isOpen, onClose }) {
  const { addEntry } = useData()
  const [form, setForm] = useState({ transport: 'none', distance: '', electricity: '', food: 'mixed' })

  if (!isOpen) return null

  const liveCO2 = calcLiveCO2({ ...form, distance: form.distance || 0, electricity: form.electricity || 0 })

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    addEntry({ ...form, co2: liveCO2 })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if(e.target === e.currentTarget) onClose() }}>
      <div className="modal-card calc-modal-card">
        <button className="modal-close" type="button" onClick={onClose}>✕</button>

        <h2 className="modal-title" style={{ marginTop: '10px' }}>Log Today</h2>
        <p className="modal-sub">Add a quick entry</p>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Transport */}
          <div className="form-group">
            <label style={{ marginBottom: '8px', display: 'block' }}>Transport</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {TRANSPORT_OPTS.map(o => (
                <button type="button" key={o.value}
                  className={`option-btn ${form.transport === o.value ? 'selected' : ''}`}
                  style={{ padding: '8px', minHeight: 'auto', fontSize: '0.9rem' }}
                  onClick={() => handleChange('transport', o.value)}>
                  {o.icon} {o.label}
                </button>
              ))}
            </div>
          </div>

          {form.transport !== 'none' && form.transport !== 'bike' && (
            <div className="form-group">
              <label>Distance (km)</label>
              <input type="number" className="calc-input" min="0" max="10000" step="0.1"
                placeholder="e.g. 15" value={form.distance}
                onChange={e => handleChange('distance', e.target.value)} />
            </div>
          )}

          {/* Electricity */}
          <div className="form-group">
            <label>Electricity (kWh)</label>
            <input type="number" className="calc-input" min="0" max="1000" step="0.1"
              placeholder="e.g. 5" value={form.electricity}
              onChange={e => handleChange('electricity', e.target.value)} />
          </div>

          {/* Food */}
          <div className="form-group">
            <label style={{ marginBottom: '8px', display: 'block' }}>Food</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {FOOD_OPTS.map(o => (
                <button type="button" key={o.value}
                  className={`option-btn ${form.food === o.value ? 'selected' : ''}`}
                  style={{ padding: '8px', minHeight: 'auto', fontSize: '0.9rem' }}
                  onClick={() => handleChange('food', o.value)}>
                  {o.icon} {o.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 600, color: '#00ff88' }}>
            Total: {liveCO2} kg CO₂
          </div>

          <button type="submit" className="modal-submit" style={{ marginTop: '15px' }}>
            Save Entry
          </button>
        </form>
      </div>
    </div>
  )
}
