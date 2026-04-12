import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import LogModal from '../components/LogModal'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-date">{label}</p>
      <p className="tooltip-val">{payload[0].value} kg CO₂</p>
    </div>
  )
}

function statusFromCO2(co2) {
  if (co2 === 0) return { label: 'No Data',  color: '#5a7a6e', cls: 'status-none' }
  if (co2 < 5)  return { label: 'Low 🟢',    color: '#00ff88', cls: 'status-low' }
  if (co2 < 10) return { label: 'Moderate 🟡', color: '#ffd700', cls: 'status-mod' }
  return           { label: 'High 🔴',        color: '#ff4d4d', cls: 'status-high' }
}

export default function Dashboard() {
  const { user } = useAuth()
  const { entries, ecoPoints, streak } = useData()
  const [view, setView] = useState('weekly') // 'weekly' | 'monthly'
  const [logModalOpen, setLogModalOpen] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const todayCO2 = entries.filter(e => e.date === today).reduce((sum, e) => sum + e.totalCO2, 0)
  const totalCO2 = entries.reduce((sum, e) => sum + e.totalCO2, 0)
  
  // Group by date for chart
  const byDate = {}
  entries.forEach(e => {
    byDate[e.date] = (byDate[e.date] || 0) + e.totalCO2
  })

  const tDate = new Date()
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(tDate)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    last7.push({ date: key, co2: parseFloat((byDate[key] || 0).toFixed(2)) })
  }

  const last30 = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(tDate)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    last30.push({ date: key, co2: parseFloat((byDate[key] || 0).toFixed(2)) })
  }

  const chartData = view === 'weekly' ? last7 : last30
  const status = statusFromCO2(todayCO2)

  // Tree / km equivalents
  const treesPerDay = totalCO2 ? (totalCO2 / 21.77).toFixed(1) : 0
  const kmNotDriven = totalCO2 ? (totalCO2 / 0.21 * 0.8).toFixed(0) : 0

  return (
    <div className="page dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">Welcome back, <strong>{user?.name}</strong> — here's your footprint at a glance.</p>
        </div>
        <button className="btn-primary" onClick={() => setLogModalOpen(true)}>+ Log Today</button>
      </div>

      {/* ── Status Cards ── */}
      <div className="dash-summary">
        <div className="summary-card glass-card">
          <div className="summary-icon">📅</div>
          <div>
            <div className="summary-val" style={{color: status.color}}>{todayCO2 || '—'} kg</div>
            <div className="summary-label">Today's CO₂</div>
            <span className={`status-badge ${status.cls}`}>{status.label}</span>
          </div>
        </div>
        <div className="summary-card glass-card">
          <div className="summary-icon">📊</div>
          <div>
            <div className="summary-val green">{(totalCO2).toFixed(2)} kg</div>
            <div className="summary-label">Total CO₂ Logged</div>
            <div className="summary-sub">{entries.length} entries</div>
          </div>
        </div>
        <div className="summary-card glass-card">
          <div className="summary-icon">🌳</div>
          <div>
            <div className="summary-val cyan">{treesPerDay}</div>
            <div className="summary-label">Trees Equivalent</div>
            <div className="summary-sub">{kmNotDriven} km not driven</div>
          </div>
        </div>
        <div className="summary-card glass-card">
          <div className="summary-icon">🔥</div>
          <div>
            <div className="summary-val" style={{color:'#ff9500'}}>{streak}</div>
            <div className="summary-label">Day Streak</div>
            <div className="summary-sub">⚡ {ecoPoints} eco points</div>
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="chart-panel glass-card">
        <div className="chart-header">
          <h2>CO₂ Emissions Over Time</h2>
          <div className="chart-tabs">
            <button className={view === 'weekly'  ? 'tab active' : 'tab'} onClick={() => setView('weekly')}>7 Days</button>
            <button className={view === 'monthly' ? 'tab active' : 'tab'} onClick={() => setView('monthly')}>30 Days</button>
          </div>
        </div>

        {chartData.length === 0 || chartData.every(d => d.co2 === 0) ? (
          <div className="chart-empty">
            <div className="empty-icon">📈</div>
            <p>No data yet — <Link to="/calculator">log your first carbon entry</Link></p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="co2Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: '#5a7a6e', fontSize: 11 }}
                tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#5a7a6e', fontSize: 11 }} unit=" kg" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="co2" stroke="#00ff88" strokeWidth={2}
                fill="url(#co2Grad)" dot={{ fill: '#00ff88', r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Recent Entries ── */}
      <div className="recent-panel glass-card">
        <h2>Recent Entries</h2>
        {entries.length === 0 ? (
          <p className="empty-text">No entries yet. <button className="btn-ghost" onClick={() => setLogModalOpen(true)}>Log your first one →</button></p>
        ) : (
          <div className="history-list">
            {entries.slice(0, 8).map(e => {
              const s = statusFromCO2(e.totalCO2)
              return (
                <div className="history-row" key={e._id}>
                  <div className="history-date">{e.date}</div>
                  <div className="history-tags">
                    {e.transport !== 'none' && <span className="tag">{e.transport} · {e.distance}km</span>}
                    {e.electricity > 0 && <span className="tag">⚡ {e.electricity}kWh</span>}
                    <span className="tag">{e.food === 'veg' ? '🥗' : e.food === 'non-veg' ? '🥩' : '🍽️'} {e.food}</span>
                  </div>
                  <div className="history-co2" style={{color: s.color}}>{e.totalCO2} kg</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <LogModal isOpen={logModalOpen} onClose={() => setLogModalOpen(false)} />
    </div>
  )
}
