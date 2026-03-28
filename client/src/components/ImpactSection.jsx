export default function ImpactSection() {
  return (
    <section className="impact" id="impact">
      <div className="section-header fade-in">
        <div className="section-tag">Why It Matters</div>
        <h2>The Hidden Cost of AI</h2>
        <p>Every AI interaction has a real-world environmental footprint that most people don't see.</p>
      </div>
      <div className="impact-grid">
        <div className="glass-card impact-card fade-in">
          <div className="impact-icon">💧</div>
          <h3>Water Consumption</h3>
          <p>Data centers use millions of liters of water daily for cooling. A single AI conversation can consume up to 500ml of fresh water.</p>
        </div>
        <div className="glass-card impact-card fade-in">
          <div className="impact-icon">⚡</div>
          <h3>Energy Demand</h3>
          <p>Training large AI models requires as much energy as five cars consume over their entire lifetimes. Every query adds to this demand.</p>
        </div>
        <div className="glass-card impact-card fade-in">
          <div className="impact-icon">🌍</div>
          <h3>Carbon Footprint</h3>
          <p>AI's global carbon emissions are projected to match the airline industry by 2030. Efficient prompting is one way to help reduce this impact.</p>
        </div>
      </div>
    </section>
  )
}
