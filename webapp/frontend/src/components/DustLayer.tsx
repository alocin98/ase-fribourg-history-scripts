// Poussière dorée qui flotte devant la vidéo du livre. Désactivée si l'utilisateur réduit les animations.
import { useEffect, useRef } from 'react'

type Mote = { x: number; y: number; r: number; vx: number; vy: number; a: number; phase: number }

export default function DustLayer({ count = 70 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let width = 0
    let height = 0
    let frame = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const spawn = (anywhere: boolean): Mote => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 10,
      r: 0.4 + Math.random() * 1.6,
      vx: -0.08 + Math.random() * 0.22,
      vy: -(0.05 + Math.random() * 0.18),
      a: 0.15 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
    })
    const motes = Array.from({ length: count }, () => spawn(true))

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height)
      for (const m of motes) {
        m.x += m.vx + Math.sin(t / 2400 + m.phase) * 0.12
        m.y += m.vy
        if (m.y < -10 || m.x < -10 || m.x > width + 10) Object.assign(m, spawn(false))
        const twinkle = 0.6 + 0.4 * Math.sin(t / 900 + m.phase)
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 226, 170, ${m.a * twinkle})`
        ctx.shadowColor = 'rgba(255, 200, 120, 0.8)'
        ctx.shadowBlur = m.r * 4
        ctx.fill()
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [count])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden="true"
    />
  )
}
