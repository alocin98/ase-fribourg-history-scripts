// Authentification par cookie de session, comme le backend.
import { ApiError, request } from './client'

export type User = {
  id: string
  email: string
  name: string
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await request<User>('/users/me')
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null
    throw error
  }
}

export function login(email: string, password: string): Promise<User> {
  return request<User>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(name: string, email: string, password: string): Promise<User> {
  await request<User>('/users/', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  return login(email, password)
}

export function logout(): Promise<void> {
  return request<void>('/logout', { method: 'POST' })
}

export function updateCurrentUser(body: { name: string; email: string; password?: string }): Promise<User> {
  return request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(body) })
}

export function deactivateAccount(): Promise<void> {
  return request<void>('/users/me/deactivate', { method: 'POST' })
}

export function deleteAccount(): Promise<void> {
  return request<void>('/users/me', { method: 'DELETE' })
}
