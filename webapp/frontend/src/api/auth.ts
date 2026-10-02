// Routes d'authentification et session locale.
import { clearToken, getToken, request, setToken } from './client'

const PROFILE_KEY = 'ase_user_profile'

// Utilisateur tel que renvoyé par GET /users/me.
type ApiUser = {
  id: string
  email: string
  name: string
}

// Profil affiché dans l'interface.
export type UserProfile = {
  name: string
  email: string
}

// Lit la date d'expiration (en secondes) contenue dans le JWT, sans vérifier la signature.
function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(payload)) as { exp?: number }
    return typeof exp === 'number' ? exp : null
  } catch {
    return null
  }
}

// Une session n'est valide que si le jeton existe et n'a pas encore expiré.
export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false

  const exp = getTokenExpiry(token)
  if (exp === null || exp * 1000 <= Date.now()) {
    logout()
    return false
  }
  return true
}

// Lit le profil sauvegardé à la connexion, ou null s'il est absent ou invalide.
export function getProfile(): UserProfile | null {
  try {
    const saved = localStorage.getItem(PROFILE_KEY)
    return saved ? JSON.parse(saved) as UserProfile : null
  } catch {
    return null
  }
}

// Connecte l'utilisateur, conserve le jeton et charge son profil.
export async function login(email: string, password: string): Promise<UserProfile> {
  const { access_token } = await request<{ access_token: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(access_token)

  try {
    const user = await request<ApiUser>('/users/me')
    const profile = { name: user.name, email: user.email }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    return profile
  } catch (error) {
    logout()
    throw error
  }
}

// Crée le compte puis ouvre directement une session.
export async function register(name: string, email: string, password: string): Promise<UserProfile> {
  await request<ApiUser>('/users/', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  return login(email, password)
}

export function logout(): void {
  clearToken()
  localStorage.removeItem(PROFILE_KEY)
}
