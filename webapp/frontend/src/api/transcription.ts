// Transcription d'une page : le texte déjà enregistré est lu tout de suite.
// Sinon un job est lancé, puis relu en long polling jusqu'au résultat.

import { ApiError, ensureCsrf, request } from './client'

const POLL_INTERVAL_MS = 300
const POLL_TIMEOUT_MS = 3 * 60 * 1000
// Une page prend quelques dizaines de secondes sur CPU ; marge large par page.
const PAGE_TIMEOUT_MS = 2 * 60 * 1000
const PENDING_STATUSES = new Set([
  'created',
  'queued',
  'in_progress',
  'pending',
  'processing',
  'running',
])
const DONE_STATUSES = new Set(['completed', 'done', 'success'])

type TranscriptionJob = {
  job_id?: string
  status?: string
}

// Rectangle en pixels de l'image d'origine : [gauche, haut, droite, bas].
export type BBox = [number, number, number, number]

export type TranscriptionWord = {
  text: string
  // Moyenne des probabilités des tokens du mot, entre 0 et 1.
  confidence: number
}

export type TranscriptionLine = {
  index: number
  text: string
  bbox: BBox | null
  // Entre 0 et 1, null si le modèle ne l'a pas fournie.
  confidence: number | null
  // Vide si le modèle n'a pas fourni le détail par mot.
  words: TranscriptionWord[]
}

export type PageTranscription = {
  text: string
  lines: TranscriptionLine[]
  imageSize: [number, number] | null
  // Faux pour une ancienne transcription (texte seul) : elle reste à refaire.
  complete: boolean
}

// Réponse du backend (schéma PageTranscriptionRead).
type PageTranscriptionResponse = {
  // null pour une ancienne transcription (texte seul).
  lines?: TranscriptionLine[] | null
  image_width?: number | null
  image_height?: number | null
}

function readText(payload: unknown): string | null {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') return null
  const record = payload as { text?: unknown; transcription?: unknown }
  if (typeof record.text === 'string') return record.text
  if (typeof record.transcription === 'string') return record.transcription
  if (record.transcription && typeof record.transcription === 'object') {
    const nested = (record.transcription as { text?: unknown }).text
    if (typeof nested === 'string') return nested
  }
  return null
}

// Le texte lu par readText, plus les lignes et la taille de l'image si elles existent.
function readTranscription(payload: unknown): PageTranscription | null {
  const text = readText(payload)
  if (text === null) return null

  const response = payload as PageTranscriptionResponse
  if (!response.lines) {
    return { text, lines: [], imageSize: null, complete: false }
  }
  let imageSize: [number, number] | null = null
  if (response.image_width && response.image_height) {
    imageSize = [response.image_width, response.image_height]
  }
  return { text, lines: response.lines, imageSize, complete: true }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

// null : pas encore de transcription. Une chaîne vide reste une transcription.
export async function getPageTranscription(
  documentId: string,
  pageId: string,
  signal?: AbortSignal,
): Promise<PageTranscription | null> {
  try {
    const payload = await request<unknown>(
      `/documents/${documentId}/pages/${pageId}/transcription`,
      { signal },
    )
    return readTranscription(payload)
  } catch (error) {
    if (signal?.aborted) throw error
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

// Attend que le job se termine, puis renvoie le texte enregistré pour la page.
export async function transcribePage(
  documentId: string,
  pageId: string,
  signal?: AbortSignal,
): Promise<PageTranscription> {
  const job = await request<TranscriptionJob>(
    `/transcriptions/document/${documentId}/pages/${pageId}`,
    {
      method: 'POST',
      signal,
    },
  )
  if (!job.job_id) throw new ApiError(0, 'Transcription')

  const started = Date.now()
  while (!signal?.aborted) {
    const current = await request<TranscriptionJob>(`/transcriptions/jobs/${job.job_id}`, {
      signal,
      headers: { 'X-CSRF-Token': await ensureCsrf() },
    })
    const status = (current.status ?? '').toLowerCase()

    if (DONE_STATUSES.has(status)) {
      const text = await getPageTranscription(documentId, pageId, signal)
      if (text !== null) return text
    } else if (status && !PENDING_STATUSES.has(status)) {
      throw new ApiError(0, 'Transcription failed')
    }

    if (Date.now() - started > POLL_TIMEOUT_MS) throw new ApiError(0, 'Transcription timed out')
    await sleep(POLL_INTERVAL_MS, signal)
  }

  throw new DOMException('Aborted', 'AbortError')
}

// Transcrit toutes les pages qui n'ont pas encore de transcription complète.
// onTick est appelé à chaque relecture du job, pour relire les pages déjà terminées.
export async function transcribeDocument(
  documentId: string,
  pageCount: number,
  signal?: AbortSignal,
  onTick?: () => void,
): Promise<void> {
  const job = await request<TranscriptionJob>(`/transcriptions/document/${documentId}`, {
    method: 'POST',
    signal,
  })
  if (!job.job_id) throw new ApiError(0, 'Transcription')

  const timeout = POLL_TIMEOUT_MS + pageCount * PAGE_TIMEOUT_MS
  const started = Date.now()
  while (!signal?.aborted) {
    const current = await request<TranscriptionJob>(`/transcriptions/jobs/${job.job_id}`, {
      signal,
      headers: { 'X-CSRF-Token': await ensureCsrf() },
    })
    const status = (current.status ?? '').toLowerCase()

    if (DONE_STATUSES.has(status)) return
    if (status && !PENDING_STATUSES.has(status)) throw new ApiError(0, 'Transcription failed')
    if (Date.now() - started > timeout) throw new ApiError(0, 'Transcription timed out')
    if (onTick) onTick()
    await sleep(POLL_INTERVAL_MS, signal)
  }

  throw new DOMException('Aborted', 'AbortError')
}
