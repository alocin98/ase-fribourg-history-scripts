import { API_URL } from '../shared/env'

const CSRF_COOKIE = 'ase_csrf'
const CSRF_HEADER = 'X-CSRF-Token'
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Minimal API client that behaves like the browser: it keeps the session and CSRF
// cookies between calls and sends the CSRF token on state-changing requests.
export class ApiClient {
  private cookies = new Map<string, string>()

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const method = (init.method ?? 'GET').toUpperCase()
    const headers = new Headers(init.headers)
    if (typeof init.body === 'string') headers.set('Content-Type', 'application/json')
    if (UNSAFE.has(method)) headers.set(CSRF_HEADER, await this.csrfToken())
    if (this.cookies.size > 0) headers.set('Cookie', this.cookieHeader())

    const response = await fetch(`${API_URL}${path}`, { ...init, method, headers })
    this.storeCookies(response)
    return response
  }

  json(path: string, method: string, body: unknown): Promise<Response> {
    return this.request(path, { method, body: JSON.stringify(body) })
  }

  private async csrfToken(): Promise<string> {
    const existing = this.cookies.get(CSRF_COOKIE)
    if (existing) return existing
    const response = await this.request('/csrf-token')
    const { csrf_token } = (await response.json()) as { csrf_token: string }
    return csrf_token
  }

  private cookieHeader(): string {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ')
  }

  private storeCookies(response: Response): void {
    for (const cookie of response.headers.getSetCookie()) {
      const [pair, ...attributes] = cookie.split(';')
      const separator = pair.indexOf('=')
      const name = pair.slice(0, separator).trim()
      const value = pair.slice(separator + 1).trim()
      const expired = attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute))
      if (expired || value === '' || value === '""') this.cookies.delete(name)
      else this.cookies.set(name, value)
    }
  }
}
