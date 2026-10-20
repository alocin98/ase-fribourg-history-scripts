import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, request } from './client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('request', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'ase_csrf=cookie-token'
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
    document.cookie = 'ase_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })

  it('returns the parsed JSON body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }))

    await expect(request('/documents')).resolves.toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/documents',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('sends the CSRF token from the cookie on unsafe requests', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))

    await request('/documents', { method: 'POST', body: JSON.stringify({}) })

    const headers = fetchMock.mock.calls[0][1]?.headers as Headers
    expect(headers.get('X-CSRF-Token')).toBe('cookie-token')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('returns undefined for 204 responses', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(request('/documents/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('throws an ApiError with the backend detail', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Not found' }, 404))

    const error = await request('/documents/1').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, message: 'Not found' })
  })

  it('throws an ApiError with status 0 on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(request('/documents')).rejects.toMatchObject({ status: 0 })
  })

  it('refreshes the CSRF token and retries once on a CSRF rejection', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: 'Invalid or missing CSRF token' }, 403))
      .mockResolvedValueOnce(jsonResponse({ csrf_token: 'fresh-token' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    await expect(request('/documents', { method: 'POST' })).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/csrf-token')
  })
})
