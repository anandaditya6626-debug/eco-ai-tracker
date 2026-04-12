import { useState, useEffect } from 'react'

export default function TrackerToggle() {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem('trackerEnabled') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('trackerEnabled', enabled)
  }, [enabled])

  return (
    <div 
      className="tracker-switch-container" 
      onClick={() => setEnabled(!enabled)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        userSelect: 'none',
        padding: '5px'
      }}
    >
      <div style={{
        width: '40px',
        height: '20px',
        background: enabled ? 'var(--green)' : '#333',
        borderRadius: '20px',
        padding: '2px',
        transition: '0.3s'
      }}>
        <div style={{
          width: '16px',
          height: '16px',
          background: '#fff',
          borderRadius: '50%',
          transform: enabled ? 'translateX(20px)' : 'translateX(0)',
          transition: '0.2s'
        }} />
      </div>
      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: enabled ? 'var(--green)' : '#888' }}>
        Live Tracker {enabled ? 'ON' : 'OFF'}
      </span>
    </div>
  )
}
