import { useState } from 'react'
import { Outlet, useLocation, useOutletContext } from 'react-router-dom'

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

  return <Outlet context={`${transition.className} motion-reduce:animate-none`} />
}

export function useAuthTransition(): string {
  return useOutletContext<string>()
}
