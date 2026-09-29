// Client minimal pour les routes d'authentification du backend FastAPI.

// En développement, Vite redirige /api vers le backend (voir vite.config.ts).
const API_URL = import.meta.env.VITE_API_URL ?? '/api'

const TOKEN_KEY = 'ase_token'
const PROFILE_KEY = 'ase_user_profile'

// Utilisateur tel que renvoyé par GET /users/me.
export type ApiUser = {
  id: string
  email: string
  name: string
  created_at: string
  updated_at: string
}

// Profil affiché dans les menus de l'interface.
export type UserProfile = {
  firstName: string
  lastName: string
  email: string
}

// Erreur portant le code HTTP pour que les pages puissent choisir le message.
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Network error')
  }

  if (!response.ok) {
    // Un jeton refusé par le backend (expiré ou invalide) termine la session locale.
    if (response.status === 401 && token) logout()

    const body = await response.json().catch(() => null)
    const detail = typeof body?.detail === 'string' ? body.detail : response.statusText
    throw new ApiError(response.status, detail)
  }

  return response.json() as Promise<T>
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
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

// Découpe le nom complet du backend en prénom et nom pour l'affichage.
function toProfile(user: ApiUser): UserProfile {
  const [firstName = '', ...rest] = user.name.trim().split(/\s+/)
  return { firstName, lastName: rest.join(' '), email: user.email }
}

// Connecte l'utilisateur, conserve le jeton et charge son profil.
export async function login(email: string, password: string): Promise<UserProfile> {
  const { access_token } = await request<{ access_token: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem(TOKEN_KEY, access_token)

  try {
    const user = await request<ApiUser>('/users/me')
    const profile = toProfile(user)
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
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PROFILE_KEY)
}
