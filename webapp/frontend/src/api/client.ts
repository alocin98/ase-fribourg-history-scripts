// Client HTTP pour l'API FastAPI. La session est un cookie HTTP-only ;
// les requêtes qui modifient l'état envoient aussi le jeton CSRF.

const API_URL = import.meta.env.VITE_API_URL ?? '/api'
const CSRF_COOKIE = 'ase_csrf'
const CSRF_HEADER = 'X-CSRF-Token'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`
  const found = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  return found ? decodeURIComponent(found.slice(prefix.length)) : null
}

let csrfRequest: Promise<string> | null = null

// Récupère un jeton CSRF. Le cookie est lisible, le même jeton part dans l'en-tête.
export function ensureCsrf(force = false): Promise<string> {
  if (!force) {
    const existing = readCookie(CSRF_COOKIE)
    if (existing) return Promise.resolve(existing)
    if (csrfRequest) return csrfRequest
  }

  csrfRequest = fetch(`${API_URL}/csrf-token`, { credentials: 'include' })
    .then(async (response) => {
      if (!response.ok) throw new ApiError(response.status, 'CSRF')
      const data = (await response.json()) as { csrf_token?: string }
      const token = data.csrf_token || readCookie(CSRF_COOKIE)
      if (!token) throw new ApiError(response.status, 'CSRF')
      return token
    })
    .finally(() => {
      csrfRequest = null
    })

  return csrfRequest
}

function isUnsafe(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

async function send(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (isUnsafe(method)) headers.set(CSRF_HEADER, await ensureCsrf())

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, method, headers, credentials: 'include' })
  } catch {
    throw new ApiError(0, 'Network error')
  }

  if (response.status === 403 && retry && isUnsafe(method)) {
    const body = await response.clone().json().catch(() => null)
    const detail = typeof body?.detail === 'string' ? body.detail : ''
    if (detail.toLowerCase().includes('csrf')) {
      await ensureCsrf(true)
      return send(path, init, false)
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = typeof body?.detail === 'string' ? body.detail : response.statusText
    throw new ApiError(response.status, detail)
  }

  return response
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await send(path, init)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
