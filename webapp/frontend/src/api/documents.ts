// Documents enregistrés par l'API : un ZIP, puis les pages extraites.
// Il n'existe pas encore de route de transcription.

import { ApiError, ensureCsrf, request } from './client'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'
const CSRF_HEADER = 'X-CSRF-Token'

export type StoredDocument = {
  id: string
  original_filename: string
  uploaded_at: string
}

export type LocalDocument = {
  id: string
  title: string
  description: string
  createdAt: string
  uploadId: string | null
}

function storageKey(userId: string): string {
  return `ase_documents:${userId}`
}

export function listLocalDocuments(userId: string): LocalDocument[] {
  try {
    const saved = localStorage.getItem(storageKey(userId))
    const parsed: unknown = saved ? JSON.parse(saved) : []
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const document = item as Partial<LocalDocument>
      if (typeof document.id !== 'string' || typeof document.title !== 'string' || typeof document.description !== 'string') return []
      return [{
        id: document.id,
        title: document.title,
        description: document.description,
        createdAt: typeof document.createdAt === 'string' ? document.createdAt : '',
        uploadId: typeof document.uploadId === 'string' ? document.uploadId : null,
      }]
    })
  } catch {
    return []
  }
}

export function createLocalDocument(userId: string, title: string, description: string): LocalDocument {
  const document: LocalDocument = {
    id: crypto.randomUUID(),
    title,
    description,
    createdAt: new Date().toISOString(),
    uploadId: null,
  }
  localStorage.setItem(storageKey(userId), JSON.stringify([document, ...listLocalDocuments(userId)]))
  notifyDocumentsChanged()
  return document
}

export function getLocalDocument(userId: string, documentId: string): LocalDocument | null {
  return listLocalDocuments(userId).find((document) => document.id === documentId) ?? null
}

export function rememberUpload(userId: string, documentId: string, uploadId: string): void {
  const documents = listLocalDocuments(userId).map((document) => (
    document.id === documentId ? { ...document, uploadId } : document
  ))
  localStorage.setItem(storageKey(userId), JSON.stringify(documents))
  notifyDocumentsChanged()
}

export function updateLocalDocument(userId: string, documentId: string, title: string, description: string): void {
  const documents = listLocalDocuments(userId).map((document) => (
    document.id === documentId ? { ...document, title, description } : document
  ))
  localStorage.setItem(storageKey(userId), JSON.stringify(documents))
  notifyDocumentsChanged()
}

function hiddenKey(userId: string): string {
  return `ase_hidden_documents:${userId}`
}

export function listHiddenDocuments(userId: string): string[] {
  try {
    const saved = localStorage.getItem(hiddenKey(userId))
    const parsed: unknown = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

async function deleteRemoteDocument(documentId: string): Promise<void> {
  try {
    await request<void>(`/documents/${documentId}`, { method: 'DELETE' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return
    throw error
  }
}

export async function deleteStoredDocument(userId: string, documentId: string): Promise<void> {
  const local = getLocalDocument(userId, documentId)
  const remoteId = local ? local.uploadId : documentId
  if (remoteId) await deleteRemoteDocument(remoteId)
  if (local) {
    const remaining = listLocalDocuments(userId).filter((document) => document.id !== documentId)
    localStorage.setItem(storageKey(userId), JSON.stringify(remaining))
  }
  notifyDocumentsChanged()
}

export function notifyDocumentsChanged(): void {
  window.dispatchEvent(new Event('ase-documents-changed'))
}

export type DocumentPage = {
  id: string
  page_number: number
  image_url: string
}

export function pageImageUrl(documentId: string, pageId: string): string {
  return `${API_URL}/documents/${documentId}/pages/${pageId}`
}

export async function listDocuments(): Promise<StoredDocument[]> {
  const response = await fetch(`${API_URL}/documents/me`, { credentials: 'include' })
  if (!response.ok) throw new ApiError(response.status, response.statusText)
  return response.json() as Promise<StoredDocument[]>
}

export async function uploadDocument(file: File): Promise<{ id: string }> {
  const body = new FormData()
  body.append('file', file)
  const headers = new Headers()
  headers.set(CSRF_HEADER, await ensureCsrf())

  let response: Response
  try {
    response = await fetch(`${API_URL}/documents/`, {
      method: 'POST',
      headers,
      body,
      credentials: 'include',
    })
  } catch {
    throw new ApiError(0, 'Network error')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const detail = typeof payload?.detail === 'string' ? payload.detail : response.statusText
    throw new ApiError(response.status, detail)
  }

  return response.json() as Promise<{ id: string }>
}

export async function listPages(documentId: string): Promise<DocumentPage[]> {
  const pages: DocumentPage[] = []
  let page = 1
  while (page < 20) {
    const response = await fetch(`${API_URL}/documents/${documentId}/pages?page=${page}&page_size=100`, {
      credentials: 'include',
    })
    if (!response.ok) throw new ApiError(response.status, response.statusText)
    const batch = (await response.json()) as DocumentPage[]
    pages.push(...batch)
    if (batch.length < 100) break
    page += 1
  }
  return pages
}
