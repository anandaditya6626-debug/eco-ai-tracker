import { useState, useEffect, useCallback } from 'react'

export default function GlobalStats({ refreshTrigger }) {
  const [stats, setStats] = useState({ totalWaterSaved: 0, totalEnergySaved: 0, totalCO2Saved: 0, totalAnalyses: 0 })

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/analysis/stats')
      if (res.ok) setStats(await res.json())
    } catch (e) { /* ignore */ }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats, refreshTrigger])

  return (
    <section className="global-stats" id="stats">
      <div className="section-header fade-in">
        <div className="section-tag">Your Contribution</div>
        <h2>Total Resources Saved</h2>
        <p>Your cumulative savings from all optimized prompts — persisted in the database.</p>
      </div>
      <div className="glass-card stats-bar fade-in">
        <div className="stat-item">
          <div className="stat-val green">{stats.totalWaterSaved?.toFixed(1) || '0.0'} ml</div>
          <div className="stat-label">Water Saved</div>
        </div>
        <div className="stat-item">
          <div className="stat-val blue">{stats.totalEnergySaved?.toFixed(3) || '0.000'} Wh</div>
          <div className="stat-label">Energy Saved</div>
        </div>
        <div className="stat-item">
          <div className="stat-val cyan">{stats.totalCO2Saved?.toFixed(3) || '0.000'} g</div>
          <div className="stat-label">CO₂ Reduced</div>
        </div>
        <div className="stat-item">
          <div className="stat-val green">{stats.totalAnalyses || 0}</div>
          <div className="stat-label">Total Analyses</div>
        </div>
      </div>
    </section>
  )
}
