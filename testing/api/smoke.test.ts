import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'

import { SAMPLE_ZIP, newUser } from '../shared/env'
import { ApiClient } from './client'

// Smoke tests for the main user flow against a running backend:
// health → register → login → create document → upload ZIP → browse pages → clean up.

let client: ApiClient

async function signUpAndLogIn(api: ApiClient) {
  const user = newUser()
  const created = await api.json('/users/', 'POST', user)
  expect(created.status).toBe(201)
  const login = await api.json('/login', 'POST', { email: user.email, password: user.password })
  expect(login.status).toBe(200)
  return user
}

afterEach(async () => {
  // Deleting the account also removes its documents and stored files.
  await client?.request('/users/me', { method: 'DELETE' })
})

describe('API smoke', () => {
  it('reports a healthy API and database', async () => {
    client = new ApiClient()
    const response = await client.request('/utils/health-check')

    expect(response.status).toBe(200)
    expect(await response.json()).toBe(true)
  })

  it('registers, logs in, reads the current user and logs out', async () => {
    client = new ApiClient()
    const user = await signUpAndLogIn(client)

    const me = await client.request('/users/me')
    expect(me.status).toBe(200)
    expect(await me.json()).toMatchObject({ email: user.email, name: user.name })

    const logout = await client.request('/logout', { method: 'POST' })
    expect(logout.status).toBe(204)
    expect((await client.request('/users/me')).status).toBe(401)

    // Log back in so afterEach can delete the account.
    await client.json('/login', 'POST', { email: user.email, password: user.password })
  })

  it('creates a document, uploads a ZIP and serves its pages', async () => {
    client = new ApiClient()
    await signUpAndLogIn(client)

    const created = await client.json('/documents/', 'POST', {
      name: 'Smoke document',
      description: 'Created by the API smoke test',
    })
    expect(created.status).toBe(201)
    const { id } = (await created.json()) as { id: string }

    const body = new FormData()
    body.append('file', new Blob([await readFile(SAMPLE_ZIP)]), 'sample-document.zip')
    const upload = await client.request(`/documents/${id}`, { method: 'POST', body })
    expect(upload.status).toBe(201)

    const documents = await (await client.request('/documents/me')).json()
    expect(documents).toContainEqual(expect.objectContaining({ id, name: 'Smoke document' }))

    const pages = (await (await client.request(`/documents/${id}/pages`)).json()) as {
      id: string
      page_number: number
      mime_type: string
    }[]
    expect(pages.map((page) => page.page_number)).toEqual([1, 2])
    expect(pages[0].mime_type).toBe('image/png')

    const image = await client.request(`/documents/${id}/pages/${pages[0].id}`)
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toBe('image/png')

    const removed = await client.request(`/documents/${id}`, { method: 'DELETE' })
    expect(removed.status).toBe(204)
    expect(await (await client.request('/documents/me')).json()).toEqual([])
  })
})
