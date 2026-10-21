import { fileURLToPath } from 'node:url'

// Base URLs of the running stack. Override them to test against dev or another port.
export const API_URL = process.env.API_URL ?? 'http://localhost:8000/api'
export const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'

// ZIP with two small PNG pages, accepted by the upload endpoint.
export const SAMPLE_ZIP = fileURLToPath(
  new URL('../fixtures/sample-document.zip', import.meta.url),
)

// A fresh account per test so runs never collide and can run in parallel.
export function newUser() {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    name: 'Smoke Tester',
    email: `smoke-${id}@example.com`,
    password: `Smoke-${id}`,
  }
}
