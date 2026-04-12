import Analyzer from '../components/Analyzer'

export default function Optimizer() {
  return (
    <div className="page optimizer-page">
      <div className="page-header">
        <div>
          <h1>⚡ Prompt Optimizer</h1>
          <p className="page-sub">Analyze and shrink the environmental footprint of your AI prompts.</p>
        </div>
      </div>
      <Analyzer />
    </div>
  )
}
