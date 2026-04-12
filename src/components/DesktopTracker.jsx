import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

const socket = io('http://localhost:5000')

export default function DesktopTracker() {
  const [data, setData] = useState({ totalCO2: 0, lastCO2: 0, transport: 'none' })

  useEffect(() => {
    // Initial fetch from localStorage if available
    const saved = localStorage.getItem('cm_entries');
    if (saved) {
      const entries = JSON.parse(saved);
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = entries.filter(e => e.date === today);
      const total = todayEntries.reduce((sum, e) => sum + e.totalCO2, 0);
      setData(prev => ({ ...prev, totalCO2: parseFloat(total.toFixed(2)) }));
    }

    // WebSocket Listener
    socket.on('entry-broadcast', (incoming) => {
      setData(incoming)
    })

    return () => {
      socket.off('entry-broadcast')
    }
  }, [])

  const handleFocusMain = () => {
    if (window.electron) window.electron.send('focus-main-window')
  }

  const color = data.totalCO2 < 3 ? '#00ff88' : data.totalCO2 < 7 ? '#ffd700' : '#ff4444'

  return (
    <div 
      onClick={handleFocusMain}
      className="cricbuzz-pill-tracker" 
      style={{
        width: '280px',
        height: '40px',
        background: 'rgba(10, 25, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        borderRadius: '25px',
        color: '#e4f0ea',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: '10px',
        WebkitAppRegion: 'drag',
        cursor: 'pointer',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Live Badge */}
      <div style={{ 
        background: 'rgba(0, 255, 136, 0.1)', 
        padding: '2px 8px', 
        borderRadius: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '5px',
        border: '1px solid rgba(0, 255, 136, 0.2)'
      }}>
        <div className="pulse-dot" style={{ width: '6px', height: '6px', background: '#00ff88', borderRadius: '50%' }} />
        <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#00ff88' }}>LIVE</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: '900', color: color, fontFamily: "'JetBrains Mono', monospace" }}>
          {data.totalCO2}
        </span>
        <span style={{ fontSize: '0.6rem', color: '#7fa898', fontWeight: '700' }}>KG</span>
      </div>

      <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

      {/* Last Action */}
      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {data.transport !== 'none' ? '🚗' : '⚡'} Logged +{data.lastCO2}
      </div>

      <style>{`
        .pulse-dot { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.4; transform: scale(0.8); } }
        body { margin: 0; background: transparent !important; }
      `}</style>
    </div>
  )
}
