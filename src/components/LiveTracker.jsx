import { useState, useEffect, useRef } from 'react'

const getTransportIcon = (t) => {
  switch (t) {
    case 'car': return '🚗 Car'
    case 'bus': return '🚌 Bus'
    case 'train': return '🚆 Train'
    case 'bike': return '🚲 Bicycle'
    case 'none': return '🚶 Walk'
    default: return '🚌 Transport'
  }
}

const getFoodCO2 = (f) => {
  switch (f) {
    case 'veg': return 3.8
    case 'mixed': return 5.5
    case 'non-veg': return 7.19
    default: return 5.5
  }
}

const TRANSPORT_FACTORS = { car: 0.21, bus: 0.089, train: 0.041, bike: 0, none: 0 }
const ELEC_FACTOR = 0.233

export default function LiveTracker({ form, liveCO2 }) {
  const [log, setLog] = useState([])
  const prevForm = useRef(form)

  // Track changes and build activity feed
  useEffect(() => {
    let newEntry = null

    if (form.transport !== prevForm.current.transport) {
      const co2 = TRANSPORT_FACTORS[form.transport] * (Number(form.distance) || 0)
      newEntry = `${getTransportIcon(form.transport)} selected → +${co2.toFixed(2)} kg CO₂`
    } else if (form.distance !== prevForm.current.distance && form.transport !== 'none') {
      const co2 = TRANSPORT_FACTORS[form.transport] * (Number(form.distance) || 0)
      newEntry = `📍 Distance updated → +${co2.toFixed(2)} kg CO₂`
    } else if (form.electricity !== prevForm.current.electricity) {
      const co2 = ELEC_FACTOR * (Number(form.electricity) || 0)
      newEntry = `⚡ Electricity updated → +${co2.toFixed(2)} kg CO₂`
    } else if (form.food !== prevForm.current.food) {
      const co2 = getFoodCO2(form.food)
      const foodName = form.food === 'veg' ? '🥗 Vegetarian' : form.food === 'non-veg' ? '🥩 Meat-heavy' : '🍽️ Mixed Diet'
      newEntry = `${foodName} selected → +${co2} kg CO₂`
    }

    if (newEntry) {
      setLog(prev => [{ id: Date.now(), text: newEntry }, ...prev].slice(0, 5))
    }

    prevForm.current = form
  }, [form])

  // Progress Bar Variables
  const MAX_LIMIT = 10
  const progressPct = Math.min((liveCO2 / MAX_LIMIT) * 100, 100)
  const statusClr = liveCO2 < 3 ? '#00ff88' : liveCO2 <= 7 ? '#ffd700' : '#ff4d4d'

  return (
    <div className="glass-card" style={{ padding: '24px', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text)' }}>📡 Live Tracker</h3>
        <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '50px', background: 'rgba(0,255,136,0.1)', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} className="blink-dot" />
          Live
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', minHeight: '120px' }}>
        {log.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text3)', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>Waiting for updates...</p>
        ) : (
          log.map(entry => (
            <div key={entry.id} style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${statusClr}`, fontSize: '0.82rem', color: 'var(--text2)', animation: 'fadeInDown 0.3s ease' }}>
              {entry.text}
            </div>
          ))
        )}
      </div>

      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Today's Progress</span>
          <span style={{ fontSize: '0.9rem', fontWeight: '800', fontFamily: "'JetBrains Mono', monospace", color: statusClr }}>{liveCO2} / {MAX_LIMIT} kg</span>
        </div>
        
        <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: statusClr, borderRadius: '4px', transition: 'width 0.4s ease, background 0.4s ease' }} />
        </div>
      </div>
      
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .blink-dot { animation: blink 1.5s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  )
}
