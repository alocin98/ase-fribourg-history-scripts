// Client HTTP commun pour le backend FastAPI.

// En développement, Vite redirige /api vers le backend (voir vite.config.ts).
const API_URL = import.meta.env.VITE_API_URL ?? '/api'

const TOKEN_KEY = 'ase_token'

// Erreur portant le code HTTP pour que les pages puissent choisir le message.
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// Envoie la requête avec le jeton et transforme les réponses en erreur en ApiError.
async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Network error')
  }

  if (!response.ok) {
    // Un jeton refusé par le backend (expiré ou invalide) termine la session locale.
    if (response.status === 401 && token) {
      clearToken()
      window.location.assign('/app/login')
    }

    const body = await response.json().catch(() => null)
    const detail = typeof body?.detail === 'string' ? body.detail : response.statusText
    throw new ApiError(response.status, detail)
  }

  return response
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await send(path, init)
  return response.json() as Promise<T>
}

