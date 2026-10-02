// Routes de lecture des documents.
import { request } from './client'

export type DocumentSummary = {
  id: string
  original_filename: string
  uploaded_at: string
}

export function listDocuments(): Promise<DocumentSummary[]> {
  return request<DocumentSummary[]>('/documents/me')
}

// Nom lisible d'un document : le nom du ZIP sans son extension.
export function documentTitle(document: DocumentSummary): string {
  return document.original_filename.replace(/\.zip$/i, '')
}
