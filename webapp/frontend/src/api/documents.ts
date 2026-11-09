// Documents enregistrés par l'API : un document est créé d'abord (nom, description),
// puis un ZIP d'images y est importé.

import { ApiError, request, requestBlob } from './client'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export type ShareRole = 'viewer' | 'editor'
export type DocumentAccess = 'owner' | ShareRole

export type StoredDocument = {
  id: string
  name: string
  description: string
  /** Rôle de l'utilisateur courant sur ce document. Défaut : owner pour /documents/me. */
  access?: DocumentAccess
  /** Nom du propriétaire, utile pour les documents partagés. */
  owner_name?: string
}

export type DocumentPage = {
  id: string
  page_number: number
  image_url: string
}

export type DocumentShare = {
  id: string
  username: string
  role: ShareRole
}

export function isDocumentOwner(document: StoredDocument | null | undefined): boolean {
  return (document?.access ?? 'owner') === 'owner'
}

export function canEditDocument(document: StoredDocument | null | undefined): boolean {
  const access = document?.access ?? 'owner'
  return access === 'owner' || access === 'editor'
}

export function notifyDocumentsChanged(): void {
  window.dispatchEvent(new Event('ase-documents-changed'))
}

export function listDocuments(): Promise<StoredDocument[]> {
  return request<StoredDocument[]>('/documents/me').then((items) =>
    items.map((item) => ({ ...item, access: item.access ?? 'owner' })),
  )
}

// Route attendue : GET /documents/shared
export async function listSharedDocuments(): Promise<StoredDocument[]> {
  try {
    const items = await request<StoredDocument[]>('/documents/shared')
    return items.map((item) => ({
      ...item,
      access: item.access === 'editor' ? 'editor' : 'viewer',
    }))
  } catch (error) {
    // Backend pas encore prêt : la section reste vide.
    if (error instanceof ApiError && (error.status === 404 || error.status === 501)) return []
    throw error
  }
}

// Il n'y a pas encore de route pour un seul document : on le cherche dans les listes.
export async function getDocument(documentId: string): Promise<StoredDocument> {
  const [owned, shared] = await Promise.all([
    listDocuments().catch(() => [] as StoredDocument[]),
    listSharedDocuments().catch(() => [] as StoredDocument[]),
  ])
  const found = [...owned, ...shared].find((document) => document.id === documentId)
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

export function pageImageInfoUrl(pageId: string): string {
  return `${API_URL}/iiif/3/${pageId}/info.json`
}

export async function listPages(documentId: string): Promise<DocumentPage[]> {
  const pages: DocumentPage[] = []
  let page = 1
  while (page < 20) {
    const batch = await request<DocumentPage[]>(
      `/documents/${documentId}/pages?page=${page}&page_size=100`,
    )
    pages.push(...batch)
    if (batch.length < 100) break
    page += 1
  }
  return pages
}

function safePdfName(name: string): string {
  const cleaned = name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_') || 'document'
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`
}

// Déclenche le téléchargement du PDF généré par le backend.
// Route attendue : GET /documents/{id}/export → application/pdf
export async function exportDocumentPdf(documentId: string, documentName: string): Promise<void> {
  const { blob, filename } = await requestBlob(`/documents/${documentId}/export`)
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = filename || safePdfName(documentName)
  link.rel = 'noopener'
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Routes attendues pour le partage :
// GET    /documents/{id}/shares
// POST   /documents/{id}/shares           { username, role }
// PATCH  /documents/{id}/shares/{shareId} { role }
// DELETE /documents/{id}/shares/{shareId}

export function listDocumentShares(documentId: string): Promise<DocumentShare[]> {
  return request<DocumentShare[]>(`/documents/${documentId}/shares`)
}

export async function shareDocument(
  documentId: string,
  username: string,
  role: ShareRole,
): Promise<DocumentShare> {
  const share = await request<DocumentShare>(`/documents/${documentId}/shares`, {
    method: 'POST',
    body: JSON.stringify({ username, role }),
  })
  notifyDocumentsChanged()
  return share
}

export async function updateDocumentShare(
  documentId: string,
  shareId: string,
  role: ShareRole,
): Promise<DocumentShare> {
  const share = await request<DocumentShare>(`/documents/${documentId}/shares/${shareId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
  notifyDocumentsChanged()
  return share
}

export async function removeDocumentShare(documentId: string, shareId: string): Promise<void> {
  await request<void>(`/documents/${documentId}/shares/${shareId}`, { method: 'DELETE' })
  notifyDocumentsChanged()
}
