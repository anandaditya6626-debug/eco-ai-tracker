import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const LEVEL_THRESHOLDS = [
  { label: 'Seedling 🌱',   min: 0,    color: '#5a7a6e' },
  { label: 'Sapling 🌿',    min: 50,   color: '#00ff88' },
  { label: 'Tree 🌳',       min: 200,  color: '#00c8ff' },
  { label: 'Forest 🌲',     min: 500,  color: '#ffd700' },
  { label: 'Eco Hero 🌍',   min: 1000, color: '#ff9500' },
]

function getLevel(pts) {
  let lvl = LEVEL_THRESHOLDS[0]
  LEVEL_THRESHOLDS.forEach(l => { if (pts >= l.min) lvl = l })
  const idx  = LEVEL_THRESHOLDS.indexOf(lvl)
  const next = LEVEL_THRESHOLDS[idx + 1]
  const pct  = next ? Math.min(100, ((pts - lvl.min) / (next.min - lvl.min)) * 100) : 100
  return { ...lvl, next, pct }
}

export default function Profile() {
  const { user } = useAuth()
  const { entries, ecoPoints, streak, badges, BADGE_RULES } = useData()

  const pts   = ecoPoints
  const level = getLevel(pts)
  
  const totalCO2Logged = entries.reduce((s, e) => s + e.totalCO2, 0)
  const avgDailyCO2    = entries.length > 0 ? (totalCO2Logged / entries.length).toFixed(1) : 0
  
  const treesTotal  = (totalCO2Logged / 21.77).toFixed(1)
  const kmNotDriven = (totalCO2Logged / 0.21 * 0.8).toFixed(0)

  const allBadges = BADGE_RULES.map(b => ({
    ...b,
    earned: badges.includes(b.id)
  }))

  return (
    <div className="page profile">
      <div className="page-header">
        <div>
          <h1>🏆 My Profile</h1>
          <p className="page-sub">Your eco journey, gamified.</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* ── Left Column ── */}
        <div className="profile-left">
          {/* User Card */}
          <div className="user-card glass-card">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() ?? '?'}</div>
            <h2 className="user-name">{user?.name}</h2>
            <p className="user-email">{user?.email}</p>
            <div className="level-badge" style={{ color: level.color, borderColor: level.color }}>
              {level.label}
            </div>

            {/* XP Bar */}
            <div className="xp-section">
              <div className="xp-label">
                <span>⚡ {pts} pts</span>
                {level.next && <span>Next: {level.next.label} ({level.next.min})</span>}
              </div>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: `${level.pct}%`, background: level.color }} />
              </div>
            </div>

            <div className="profile-stats">
              <div className="pstat">
                <div className="pstat-val" style={{color:'#ff9500'}}>{streak}</div>
                <div className="pstat-label">🔥 Day Streak</div>
              </div>
              <div className="pstat">
                <div className="pstat-val" style={{color:'#00ff88'}}>{entries.length}</div>
                <div className="pstat-label">📋 Entries</div>
              </div>
              <div className="pstat">
                <div className="pstat-val" style={{color:'#00c8ff'}}>{avgDailyCO2}</div>
                <div className="pstat-label">🌍 Avg kg/day</div>
              </div>
            </div>
          </div>

          {/* Impact Card */}
          <div className="impact-equiv-card glass-card">
            <h3>🌱 Your Total Impact</h3>
            <div className="impact-equiv-grid">
              <div className="impact-equiv-item">
                <div className="impact-big">🌳</div>
                <div className="impact-num">{treesTotal}</div>
                <div className="impact-desc">trees' daily absorption</div>
              </div>
              <div className="impact-equiv-item">
                <div className="impact-big">🚗</div>
                <div className="impact-num">{kmNotDriven}</div>
                <div className="impact-desc">km saved vs car</div>
              </div>
              <div className="impact-equiv-item">
                <div className="impact-big">📊</div>
                <div className="impact-num">{totalCO2Logged.toFixed(1)}</div>
                <div className="impact-desc">kg CO₂ tracked</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="profile-right">
          {/* Badges */}
          <div className="badges-panel glass-card">
            <h2>🏅 Achievements</h2>
            <div className="badges-grid">
              {allBadges.map(b => (
                <div key={b.id} className={`badge-card ${b.earned ? 'earned' : 'locked'}`}>
                  <div className="badge-icon">{b.label.split(' ')[0]}</div>
                  <div className="badge-name">{b.label.split(' ').slice(1).join(' ')}</div>
                  <div className="badge-desc">{b.desc}</div>
                  {!b.earned && <div className="badge-lock">🔒 Locked</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="leaderboard glass-card">
            <h2>🌍 Leaderboard</h2>
            <div className="lb-list">
              <div className="lb-row top">
                <div className="lb-rank">🥇</div>
                <div className="lb-name">{user?.name || "You"}</div>
                <div className="lb-pts">⚡ {ecoPoints}</div>
              </div>
              <p className="empty-text" style={{padding:'20px',textAlign:'center'}}>Keep pushing to maintain #1 locally!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
