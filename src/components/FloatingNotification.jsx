import { useState, useEffect } from 'react'

export default function FloatingNotification() {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (window.electron) {
      window.electron.on('display-notify', (payload) => {
        setData(payload)
      })
    }
  }, [])

  if (!data) return null

  const handleNotificationClick = () => {
    if (window.electron) {
      window.electron.send('open-tracker-from-notification')
    }
  }

  return (
    <div 
      onClick={handleNotificationClick}
      className="floating-notification-card" 
      style={{
        width: '100vw',
        height: '100vh',
        background: 'rgba(10, 25, 20, 0.95)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        color: '#e4f0ea',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        animation: 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1rem' }}>🌱</span>
          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--green)' }}>ECO UPDATE</span>
        </div>
        <span style={{ fontSize: '0.65rem', color: '#7fa898', fontWeight: '600' }}>Click to view details</span>
      </div>

      <div style={{ fontSize: '1.2rem', fontWeight: '900', fontFamily: "'JetBrains Mono', monospace", marginBottom: '2px' }}>
        {data.totalCO2} <span style={{ fontSize: '0.7rem' }}>kg CO₂</span>
      </div>
      
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {data.transport !== 'none' ? '🚗' : '⚡'} Activity Logged → +{data.lastCO2}kg
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        body { margin: 0; overflow: hidden; background: transparent !important; }
      `}</style>
    </div>
  )
}
