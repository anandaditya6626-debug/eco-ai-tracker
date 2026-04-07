import { useEffect, useRef } from 'react'

class Particle {
  constructor(canvas) {
    this.canvas = canvas
    this.reset(true)
  }
  reset(init) {
    this.x = Math.random() * this.canvas.width
    this.y = init ? Math.random() * this.canvas.height : this.canvas.height + 10
    this.size = Math.random() * 2.5 + 0.5
    this.speedY = -(Math.random() * 0.8 + 0.2)
    this.speedX = (Math.random() - 0.5) * 0.3
    this.opacity = Math.random() * 0.5 + 0.1
    this.hue = Math.random() > 0.5 ? 150 : 195
  }
  update() {
    this.y += this.speedY
    this.x += this.speedX
    if (this.y < -10) this.reset(false)
  }
  draw(ctx) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${this.hue}, 100%, 65%, ${this.opacity})`
    ctx.fill()
  }
}

export default function ParticleCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    const particles = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 80; i++) particles.push(new Particle(canvas))

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => { p.update(); p.draw(ctx) })
      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} id="particles-canvas" />
}
