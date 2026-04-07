export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero-content">
        <h1>Track Your AI's Environmental Impact</h1>
        <p>
          Every AI prompt consumes water for cooling, electricity for processing,
          and generates CO₂ emissions. Understand your footprint and learn to optimize.
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="num">500ml</div>
            <div className="label">Water per AI session</div>
          </div>
          <div className="hero-stat">
            <div className="num">4.2Wh</div>
            <div className="label">Energy per query</div>
          </div>
          <div className="hero-stat">
            <div className="num">8.4g</div>
            <div className="label">CO₂ per interaction</div>
          </div>
        </div>
      </div>
      <div className="scroll-indicator">
        <span>Scroll to explore</span>
        <svg width="16" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="1" width="10" height="18" rx="5" />
          <line x1="8" y1="5" x2="8" y2="9" />
        </svg>
      </div>
    </section>
  )
}
