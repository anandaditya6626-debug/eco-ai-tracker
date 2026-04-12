import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthModal from '../components/AuthModal'
import ParticleCanvas from '../components/ParticleCanvas'
import TrackerToggle from '../components/TrackerToggle'

const FEATURES = [
  { icon: '📊', title: 'Smart Dashboard',     desc: 'Visualize your daily, weekly & monthly CO₂ with beautiful charts' },
  { icon: '🧮', title: 'Carbon Calculator',   desc: 'Track transport, electricity, and food habits precisely' },
  { icon: '🤖', title: 'AI Eco Assistant',    desc: 'Get personalized tips powered by GPT-4 based on your data' },
  { icon: '🏆', title: 'Gamification',        desc: 'Earn points, build streaks, and unlock eco achievement badges' },
  { icon: '🌳', title: 'Impact Visualization',desc: 'See your efforts as trees saved and km not driven' },
  { icon: '📍', title: 'Eco Tips',            desc: 'Location-aware sustainability suggestions and weekly reports' },
]

const IMPACT_STATS = [
  { val: '1.2M+', label: 'kg CO₂ Tracked',   color: 'green' },
  { val: '48K+',  label: 'Trees Equivalent',  color: 'cyan'  },
  { val: '12K+',  label: 'Active Users',       color: 'blue'  },
]

export default function Landing() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('register')

  const handleCTA = () => {
    if (user) navigate('/dashboard')
    else { setAuthMode('register'); setAuthOpen(true) }
  }

  return (
    <main className="landing">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <h1>
            Track. Reduce.<br />
            <span className="gradient-text">Save the Planet.</span>
          </h1>
          <p>Eco AI Tracker is your intelligent sustainability companion — measure your footprint, get personalized AI advice, and earn rewards for going green.</p>

          <div className="hero-btns">
            <button className="btn-primary hero-cta" onClick={handleCTA}>
              🌱 Start Tracking Free
            </button>
            <a href="#features" className="btn-ghost">
              Explore Features →
            </a>
          </div>

          {window.electron && (
            <div className="desktop-hero-console glass-card" style={{ 
              marginTop: '30px', 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '15px',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              background: 'rgba(0, 255, 136, 0.03)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--green)' }}>📡 Live Desktop Monitoring</h3>
                  <p style={{ fontSize: '0.85rem', margin: '4px 0 0', color: 'var(--text-muted)' }}>
                    Keep the tracker visible on your screen while using other apps.
                  </p>
                </div>
                <TrackerToggle />
              </div>
            </div>
          )}

          <div className="hero-stats">
            {IMPACT_STATS.map(s => (
              <div className="hero-stat" key={s.label}>
                <div className={`num ${s.color}`}>{s.val}</div>
                <div className="label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating visual */}
        <div className="hero-visual">
          <div className="co2-globe">
            <div className="globe-ring ring-1" />
            <div className="globe-ring ring-2" />
            <div className="globe-ring ring-3" />
            <div className="globe-core">🌍</div>
            <div className="orbit-dot dot-a">🌱</div>
            <div className="orbit-dot dot-b">⚡</div>
            <div className="orbit-dot dot-c">💧</div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section" id="features">
        <div className="section-header">
          <span className="section-tag">FEATURES</span>
          <h2>Everything You Need to Go Green</h2>
          <p>A complete sustainability platform built for the modern eco-conscious individual.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div className="feature-card glass-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Impact Section ── */}
      <section className="impact-section">
        <div className="section-header">
          <span className="section-tag">IMPACT</span>
          <h2>Your Actions, Visualized</h2>
          <p>Every choice you log becomes a step toward a measurable difference.</p>
        </div>
        <div className="impact-cards">
          <div className="impact-card glass-card">
            <div className="impact-icon">🌳</div>
            <h3>Trees Saved</h3>
            <p>Each kg of CO₂ you avoid equals a tree absorbing carbon for a full day.</p>
          </div>
          <div className="impact-card glass-card">
            <div className="impact-icon">🚗</div>
            <h3>Km Not Driven</h3>
            <p>We convert your saved emissions into equivalent car-free kilometers.</p>
          </div>
          <div className="impact-card glass-card">
            <div className="impact-icon">⚡</div>
            <h3>Energy Saved</h3>
            <p>Electricity reductions translate directly to kWh saved from the grid.</p>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-banner glass-card">
        <h2>Ready to Make a Difference?</h2>
        <p>Join thousands of users tracking their footprint and earning eco rewards.</p>
        <button className="btn-primary" onClick={handleCTA}>🚀 Get Started — It's Free</button>
      </section>

      <footer className="footer">
        <div className="footer-logo">🌿 Eco AI Tracker</div>
        <p>Building a sustainable future, one data point at a time.</p>
        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#impact">Impact</a>
          <span style={{color:'var(--text-muted)'}}>© 2024 Eco AI Tracker</span>
        </div>
      </footer>

      <AuthModal isOpen={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} onSwitchMode={setAuthMode} />
    </main>
  )
}
