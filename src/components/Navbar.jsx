import { useState, useEffect } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
      <a href="#" className="nav-logo">
        <svg viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="#00ff88" strokeWidth="2" />
          <path d="M16 8c0 8-6 12-6 16h12c0-4-6-8-6-16z" fill="#00ff88" opacity="0.7" />
          <path d="M13 24c1-3 3-5 3-9 0 4 2 6 3 9" stroke="#050a0e" strokeWidth="1.5" />
        </svg>
        Eco AI Tracker
      </a>
      <ul className={`nav-links ${menuOpen ? 'open' : ''}`} id="nav-links">
        <li><a href="#hero" onClick={() => setMenuOpen(false)}>Home</a></li>
        <li><a href="#analyzer" onClick={() => setMenuOpen(false)}>Analyzer</a></li>
        <li><a href="#impact" onClick={() => setMenuOpen(false)}>About Impact</a></li>
        <li><a href="#stats" className="nav-cta" onClick={() => setMenuOpen(false)}>Stats</a></li>
      </ul>
      <button className="mobile-toggle" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
    </nav>
  )
}
