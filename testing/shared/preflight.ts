import { API_URL } from './env'

// Fails fast with a clear message when API_URL does not point at our backend
// (stack not started, or another service occupying the port).
export default async function preflight() {
  const url = `${API_URL}/utils/health-check`
  let detail: string
  try {
    const response = await fetch(url)
    if (response.ok && (await response.json()) === true) return
    detail = `got HTTP ${response.status}`
  } catch (error) {
    detail = error instanceof Error ? error.message : String(error)
  }
  const error = new Error(
    `Backend not reachable at ${url} (${detail}).\n` +
      'Start the stack with `make start`, check that nothing else uses the API port, ' +
      'or set API_URL to the running backend.',
  )
  // A plain stack keeps the message readable (vitest's source mapping chokes on this one).
  error.stack = error.message
  throw error
}
