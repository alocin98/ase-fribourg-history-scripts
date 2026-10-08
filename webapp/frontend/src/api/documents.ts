// Documents enregistrés par l'API : un document est créé d'abord (nom, description),
// puis un ZIP d'images y est importé.
// La transcription d'une page passe par le backend, qui appelle le service ML.

import { ApiError, request } from './client'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export type StoredDocument = {
  id: string
  name: string
  description: string
}

export type DocumentPage = {
  id: string
  page_number: number
  image_url: string
}

export function notifyDocumentsChanged(): void {
  window.dispatchEvent(new Event('ase-documents-changed'))
}

export function listDocuments(): Promise<StoredDocument[]> {
  return request<StoredDocument[]>('/documents/me')
}

// Il n'y a pas de route pour un seul document : on le cherche dans la liste.
export async function getDocument(documentId: string): Promise<StoredDocument> {
  const found = (await listDocuments()).find((document) => document.id === documentId)
  if (!found) throw new ApiError(404, 'Document not found')
  return found
}

export async function createDocument(name: string, description: string): Promise<{ id: string }> {
  const created = await request<{ id: string }>('/documents/', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  })
  notifyDocumentsChanged()
  return created
}

export async function deleteDocument(documentId: string): Promise<void> {
  try {
    await request<void>(`/documents/${documentId}`, { method: 'DELETE' })
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
  }
  notifyDocumentsChanged()
}

// Importe les images d'un ZIP dans un document existant.
export function uploadDocument(documentId: string, file: File): Promise<{ id: string }> {
  const body = new FormData()
  body.append('file', file)
  return request<{ id: string }>(`/documents/${documentId}`, { method: 'POST', body })
}

export function pageImageUrl(documentId: string, pageId: string): string {
  return `${API_URL}/documents/${documentId}/pages/${pageId}`
}

// Le backend n'expose pas encore cette route. Le texte est lu dès qu'elle répond.
export async function transcribePage(documentId: string, pageId: string): Promise<string> {
  const payload = await request<unknown>(`/documents/${documentId}/pages/${pageId}/transcription`, { method: 'POST' })
  if (typeof payload === 'string') return payload
  if (payload && typeof payload === 'object') {
    const record = payload as { text?: unknown; transcription?: unknown }
    if (typeof record.text === 'string') return record.text
    if (typeof record.transcription === 'string') return record.transcription
  }
  return ''
}

export async function listPages(documentId: string): Promise<DocumentPage[]> {
  const pages: DocumentPage[] = []
  let page = 1
  while (page < 20) {
    const batch = await request<DocumentPage[]>(`/documents/${documentId}/pages?page=${page}&page_size=100`)
    pages.push(...batch)
    if (batch.length < 100) break
    page += 1
  }
  return pages
}
