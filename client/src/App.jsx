import { useState, useEffect } from 'react'
import ParticleCanvas from './components/ParticleCanvas'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Analyzer from './components/Analyzer'
import ImpactSection from './components/ImpactSection'
import GlobalStats from './components/GlobalStats'
import Footer from './components/Footer'

export default function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Scroll animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible')
        })
      },
      { threshold: 0.15 }
    )
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Re-observe after any render to catch new .fade-in elements
  useEffect(() => {
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) e.target.classList.add('visible')
          })
        },
        { threshold: 0.15 }
      )
      document.querySelectorAll('.fade-in:not(.visible)').forEach((el) => observer.observe(el))
    }, 100)
    return () => clearTimeout(timer)
  })

  return (
    <>
      <ParticleCanvas />
      <div className="bg-gradient" />
      <Navbar />
      <Hero />
      <Analyzer onNewAnalysis={() => setRefreshTrigger((t) => t + 1)} />
      <ImpactSection />
      <GlobalStats refreshTrigger={refreshTrigger} />
      <Footer />
    </>
  )
}
