import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom'

type Transition = {
  path: string
  className: string
}

function motionClass(from: string, to: string): string {
  if (from === '/login' && to === '/register') return 'animate-auth-from-right'
  if (from === '/register' && to === '/login') return 'animate-auth-from-left'
  return 'animate-auth-in'
}

// Reste affiché pendant le passage de connexion à inscription ou vice versa.
export function AuthMotionLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [isExiting, setIsExiting] = useState(false)
  const [transition, setTransition] = useState<Transition>({
    path: pathname,
    className: 'animate-auth-in',
  })

  if (transition.path !== pathname) {
    setTransition({
      path: pathname,
      className: motionClass(transition.path, pathname),
    })
  }

  // Molette vers le haut, glissé vers le bas ou flèche haut (hors champ) : retour à l'accueil.
  useEffect(() => {
    let wheelTotal = 0
    let wheelReset = 0
    let touchStartY: number | null = null
    let leaveTimer = 0
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const goHome = () => {
      if (leaveTimer) return
      setIsExiting(true)
      leaveTimer = window.setTimeout(() => navigate('/'), reduce ? 0 : 450)
    }
    // Si l'élément sous le curseur peut encore défiler vers le haut, on le laisse faire.
    const canScrollUp = (target: EventTarget | null) => {
      for (let el = target as HTMLElement | null; el; el = el.parentElement) {
        if (el.scrollTop > 0) return true
      }
      return false
    }
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY >= 0 || canScrollUp(e.target)) return
      wheelTotal -= e.deltaY
      window.clearTimeout(wheelReset)
      wheelReset = window.setTimeout(() => (wheelTotal = 0), 250)
      if (wheelTotal > 60) goHome()
    }
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? null
    }
    const onTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0]?.clientY
      if (
        touchStartY !== null &&
        endY !== undefined &&
        endY - touchStartY > 80 &&
        !canScrollUp(e.target)
      )
        goHome()
      touchStartY = null
    }
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowUp' || e.key === 'PageUp') goHome()
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(wheelReset)
      window.clearTimeout(leaveTimer)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [navigate])

  const motion = isExiting
    ? 'translate-y-10 opacity-0 transition-[transform,opacity] duration-[450ms] ease-in'
    : `${transition.className} motion-reduce:animate-none`
  return <Outlet context={motion} />
}

export function useAuthTransition(): string {
  return useOutletContext<string>()
}
