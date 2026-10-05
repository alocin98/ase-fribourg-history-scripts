import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest, type User } from '../api/auth'
import { ApiError } from '../api/client'

type AuthContextValue = {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  applyUser: (next: User) => void
  forgetUser: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then((next) => {
        if (active) setUser(next)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    login: async (email, password) => {
      setUser(await loginRequest(email, password))
    },
    register: async (name, email, password) => {
      setUser(await registerRequest(name, email, password))
    },
    logout: async () => {
      try {
        await logoutRequest()
      } catch (error) {
        if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 204)) throw error
      }
      setUser(null)
    },
    applyUser: (next) => setUser(next),
    forgetUser: () => setUser(null),
  }), [user, ready])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
