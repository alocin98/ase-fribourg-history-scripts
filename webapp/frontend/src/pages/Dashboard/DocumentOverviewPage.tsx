import { useEffect, useLayoutEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../api/client'
import {
  deleteDocument,
  getDocument,
  listPages,
  pageImageUrl,
  uploadDocument,
  type DocumentPage,
  type StoredDocument,
} from '../../api/documents'
import {
  getPageTranscription,
  transcribeDocument,
  transcribePage,
  type PageTranscription,
  type TranscriptionLine as TranscriptionLineData,
} from '../../api/transcription'
import DocumentActions from './DocumentActions'
import DocumentsFrame from './DocumentsFrame'
import LineDialog from './LineDialog'
import LineSource from './LineSource'
import PageImage from './PageImage'
import PageRating from './PageRating'
import TranscriptionLine from './TranscriptionLine'
import DocumentRating from './DocumentRating'
import {
  confidencePercent,
  levelColors,
  linesOf,
  pageRating,
  type Rating,
} from './transcriptionLines'

// Délai minimal entre deux relectures des pages pendant la transcription du document.
const REFRESH_INTERVAL_MS = 3000

// Une page reste à transcrire sans transcription, ou avec une ancienne (texte seul).
function needsWork(transcription: PageTranscription | null | undefined): boolean {
  return transcription === null || (transcription !== undefined && !transcription.complete)
}

const panelClass =
  'flex min-h-0 flex-col overflow-hidden rounded-[1.25rem] bg-white shadow-[0_10px_28px_rgba(23,28,51,0.06)]'

// Trois colonnes : noms des images, image choisie, transcription.
export default function DocumentOverviewPage() {
  const { t } = useTranslation()
  const { documentId = '' } = useParams()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  // undefined : en chargement, null : introuvable.
  const [document, setDocument] = useState<StoredDocument | null | undefined>(undefined)
  const [pages, setPages] = useState<DocumentPage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isOver, setIsOver] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState(false)
  // undefined : pas encore lue, null : aucune transcription, objet : transcription enregistrée.
  const [texts, setTexts] = useState<Record<string, PageTranscription | null>>({})
  // Ligne survolée (et d'où vient le survol) ou ouverte dans la fenêtre, pour une page donnée.
  const [hover, setHover] = useState<{
    pageId: string
    index: number
    from: 'text' | 'image'
  } | null>(null)
  const [opened, setOpened] = useState<{ pageId: string; index: number } | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)
  const pollAbort = useRef<AbortController | null>(null)
  // Transcription des pages restantes : pages attendues par le job en cours.
  const [documentJob, setDocumentJob] = useState<{ pageIds: string[] } | null>(null)
  const [documentJobFailed, setDocumentJobFailed] = useState(false)
  const documentAbort = useRef<AbortController | null>(null)
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [descriptionOverflows, setDescriptionOverflows] = useState(false)

  useEffect(() => {
    let cancelled = false
    setDocument(undefined)
    setPages([])
    setSelectedId(null)
    setTexts({})
    setDocumentJob(null)
    setDocumentJobFailed(false)
    documentAbort.current?.abort()
    setPendingId(null)
    setFailedId(null)
    pollAbort.current?.abort()
    setDescriptionOpen(false)
    setDescriptionOverflows(false)
    getDocument(documentId)
      .then(async (found) => {
        if (cancelled) return
        setDocument(found)
        const items = await listPages(found.id)
        if (cancelled) return
        setPages(items)
        setSelectedId(items[0]?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) setDocument((current) => (current === undefined ? null : current))
      })
    return () => {
      cancelled = true
      pollAbort.current?.abort()
      documentAbort.current?.abort()
    }
  }, [documentId])

  // Au retour sur une image, afficher la transcription déjà enregistrée.
  useEffect(() => {
    if (!selectedId) return
    const pageId = selectedId
    let cancelled = false
    getPageTranscription(documentId, pageId)
      .then((text) => {
        if (cancelled) return
        setTexts((current) => {
          if (text === null && current[pageId]) return current
          return { ...current, [pageId]: text }
        })
        if (text !== null) setFailedId((current) => (current === pageId ? null : current))
      })
      .catch(() => {
        if (cancelled) return
        setTexts((current) => (pageId in current ? current : { ...current, [pageId]: null }))
      })
    return () => {
      cancelled = true
    }
  }, [documentId, selectedId])

  // Les transcriptions de toutes les pages, pour noter chacune dans la liste des images.
  useEffect(() => {
    let cancelled = false
    for (const page of pages) {
      getPageTranscription(documentId, page.id)
        .then((transcription) => {
          if (cancelled) return
          setTexts((current) =>
            current[page.id] ? current : { ...current, [page.id]: transcription },
          )
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [documentId, pages])

  // line-clamp masque la hauteur réelle : on mesure une copie sans limite.
  useLayoutEffect(() => {
    const node = descriptionRef.current
    if (!node || descriptionOpen) return
    const measure = () => {
      const probe = node.cloneNode(true) as HTMLParagraphElement
      probe.classList.remove('line-clamp-2')
      probe.style.position = 'absolute'
      probe.style.visibility = 'hidden'
      probe.style.pointerEvents = 'none'
      probe.style.height = 'auto'
      probe.style.maxHeight = 'none'
      probe.style.overflow = 'visible'
      probe.style.display = 'block'
      probe.style.webkitLineClamp = 'unset'
      probe.style.width = `${node.clientWidth}px`
      node.parentElement?.appendChild(probe)
      const lineHeight = Number.parseFloat(getComputedStyle(node).lineHeight) || 28
      const overflows = probe.offsetHeight > lineHeight * 2 + 1
      probe.remove()
      setDescriptionOverflows(overflows)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [document?.description, descriptionOpen])

  const takeFile = (next: File | null) => {
    setFile(next)
    setFormError(null)
  }

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsOver(false)
    takeFile(event.dataTransfer.files?.[0] ?? null)
  }

  const closeDialog = () => {
    setIsOpen(false)
    setFile(null)
    setFormError(null)
    setIsOver(false)
    setIsSaving(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || !file.name.toLowerCase().endsWith('.zip')) {
      setFormError(t('errors.zipOnly'))
      return
    }
    setIsSaving(true)
    setFormError(null)
    try {
      await uploadDocument(documentId, file)
      const items = await listPages(documentId)
      setPages(items)
      setSelectedId(items[0]?.id ?? null)
      closeDialog()
    } catch (error) {
      const invalid = error instanceof ApiError && (error.status === 400 || error.status === 413)
      setFormError(t(invalid ? 'errors.invalidZip' : 'errors.server'))
      setIsSaving(false)
    }
  }

  const transcribe = async () => {
    if (!selectedId || pendingId === selectedId) return
    pollAbort.current?.abort()
    const controller = new AbortController()
    pollAbort.current = controller
    const pageId = selectedId
    setPendingId(pageId)
    setFailedId((current) => (current === pageId ? null : current))
    try {
      const text = await transcribePage(documentId, pageId, controller.signal)
      if (controller.signal.aborted) return
      setTexts((current) => ({ ...current, [pageId]: text }))
      setFailedId((current) => (current === pageId ? null : current))
    } catch {
      if (controller.signal.aborted) return
      setFailedId(pageId)
    } finally {
      if (pollAbort.current === controller) setPendingId(null)
    }
  }

  // Relit les pages données une par une et remplace leur transcription quand elle existe.
  const refreshPages = async (pageIds: string[], signal: AbortSignal) => {
    for (const pageId of pageIds) {
      try {
        const transcription = await getPageTranscription(documentId, pageId, signal)
        if (signal.aborted) return
        if (transcription !== null) {
          setTexts((current) => ({ ...current, [pageId]: transcription }))
        }
      } catch {
        // Page illisible pour l'instant : on passe à la suivante.
      }
    }
  }

  // Les pages qui n'ont pas encore de transcription complète.
  const remainingIds: string[] = []
  for (const page of pages) {
    if (needsWork(texts[page.id])) remainingIds.push(page.id)
  }

  const transcribeRemaining = async () => {
    if (documentJob || remainingIds.length === 0) return
    documentAbort.current?.abort()
    const controller = new AbortController()
    documentAbort.current = controller
    const pageIds = remainingIds
    setDocumentJob({ pageIds })
    setDocumentJobFailed(false)
    let lastRefresh = 0
    try {
      await transcribeDocument(documentId, pageIds.length, controller.signal, () => {
        // Les pages finies apparaissent au fil du job, sans relire à chaque sondage.
        if (Date.now() - lastRefresh < REFRESH_INTERVAL_MS) return
        lastRefresh = Date.now()
        void refreshPages(pageIds, controller.signal)
      })
    } catch {
      if (controller.signal.aborted) return
      setDocumentJobFailed(true)
    }
    await refreshPages(pageIds, controller.signal)
    if (documentAbort.current === controller) setDocumentJob(null)
  }

  const shownText = selectedId ? texts[selectedId] : undefined
  // Sans image, selectedId et pendingId valent tous deux null : ne pas les comparer.
  const isPending = selectedId !== null && pendingId === selectedId
  const waiting = isPending && !shownText
  const failed = selectedId !== null && failedId === selectedId && !shownText
  const imageSize = shownText ? shownText.imageSize : null
  const lines = shownText ? linesOf(shownText) : []
  const hovered = hover !== null && hover.pageId === selectedId ? hover : null
  const openedIndex = opened !== null && opened.pageId === selectedId ? opened.index : null

  // Note de chaque page (undefined : pas encore lue, null : rien à noter),
  // puis note du document calculée sur les lignes de toutes les pages.
  const pageRatings: Record<string, Rating | null | undefined> = {}
  const allLines: TranscriptionLineData[] = []
  let ratedCount = 0
  for (const page of pages) {
    const transcription = texts[page.id]
    if (!transcription) {
      pageRatings[page.id] = transcription
      continue
    }
    const pageLines = linesOf(transcription)
    pageRatings[page.id] = pageRating(pageLines)
    if (pageRatings[page.id] !== null) ratedCount = ratedCount + 1
    for (const line of pageLines) allLines.push(line)
  }
  const documentRating = pageRating(allLines)

  // La ligne mise en avant : celle survolée, sinon celle ouverte dans la fenêtre.
  let activeIndex: number | null = openedIndex
  if (hovered !== null) activeIndex = hovered.index
  let activeLine: TranscriptionLineData | null = null
  let hasBoxes = false
  for (const line of lines) {
    if (line.index === activeIndex) activeLine = line
    if (line.bbox !== null) hasBoxes = true
  }

  // Avancement de la transcription du document : pages déjà terminées.
  let doneCount = 0
  if (documentJob) {
    for (const pageId of documentJob.pageIds) {
      if (!needsWork(texts[pageId])) doneCount = doneCount + 1
    }
  }

  const imageSrc = selectedId ? pageImageUrl(documentId, selectedId) : ''
  const hoverLine = (from: 'text' | 'image', index: number | null) => {
    if (index === null || !selectedId) setHover(null)
    else setHover({ pageId: selectedId, index, from })
  }
  const openLine = (index: number) => {
    if (selectedId) setOpened({ pageId: selectedId, index })
  }

  return (
    <DocumentsFrame>
      <main className="flex h-full min-h-0 flex-col overflow-hidden px-5 py-6 sm:px-8 lg:px-10">
        {document === undefined ? (
          <p className="m-0 font-sans text-[1rem] text-[#5d657c]">{t('common.loading')}</p>
        ) : document === null ? (
          <p className="m-0 font-sans text-[1rem] text-[#5d657c]">{t('documents.missing')}</p>
        ) : (
          <>
            <div className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <h1 className="m-0 min-w-0 font-sans text-[clamp(1.45rem,3vw,1.85rem)] leading-tight font-bold tracking-[-0.03em] break-words text-[#171c33]">
                    {document.name}
                  </h1>
                  {documentRating && (
                    <DocumentRating
                      rating={documentRating}
                      rated={ratedCount}
                      total={pages.length}
                    />
                  )}
                </div>
                {document.description && (
                  <div className="relative mt-2 min-w-0">
                    <p
                      ref={descriptionRef}
                      className={`mb-0 max-w-full font-sans text-[0.98rem] leading-7 break-words whitespace-pre-wrap text-[#5d657c] ${descriptionOpen ? '' : 'line-clamp-2'} ${!descriptionOpen && descriptionOverflows ? 'pr-7' : ''}`}
                    >
                      {document.description}
                    </p>
                    {descriptionOverflows && (
                      <button
                        type="button"
                        className={`grid size-6 cursor-pointer place-items-center rounded-full bg-[#f5f6fa] text-[#171c33] ${descriptionOpen ? 'mt-1' : 'absolute right-0 bottom-0'}`}
                        aria-expanded={descriptionOpen}
                        aria-label={t(
                          descriptionOpen
                            ? 'documents.collapseDescription'
                            : 'documents.expandDescription',
                        )}
                        onClick={() => setDescriptionOpen((open) => !open)}
                      >
                        <svg
                          className={`size-4 ${descriptionOpen ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.25"
                          aria-hidden="true"
                        >
                          <path
                            d="M5 7.5 L10 12.5 L15 7.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex w-full shrink-0 flex-nowrap items-center gap-2 sm:w-auto sm:justify-end">
                <DocumentActions
                  id={documentId}
                  onRemove={() => {
                    setDeleteError(false)
                    void deleteDocument(documentId)
                      .then(() => navigate('/app/documents'))
                      .catch(() => setDeleteError(true))
                  }}
                />
                {(remainingIds.length > 0 || documentJob) && (
                  <button
                    type="button"
                    className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-4 font-sans text-[0.82rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={documentJob !== null || pendingId !== null}
                    onClick={() => {
                      void transcribeRemaining()
                    }}
                  >
                    {documentJob && (
                      <span
                        className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden="true"
                      />
                    )}
                    {documentJob
                      ? t('documents.transcribingProgress', {
                          done: doneCount,
                          total: documentJob.pageIds.length,
                        })
                      : t('documents.transcribeRemaining', { count: remainingIds.length })}
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white"
                  onClick={() => setIsOpen(true)}
                >
                  {t('documents.upload')}
                </button>
              </div>
            </div>
            {documentJobFailed && (
              <p className="mt-4 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">
                {t('errors.documentTranscriptionFailed')}
              </p>
            )}
            {deleteError && (
              <p className="mt-4 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">
                {t('errors.deleteFailed')}
              </p>
            )}
            <div className="mt-6 grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 overflow-hidden min-[900px]:grid-cols-[10.5rem_minmax(0,1fr)_minmax(0,1.45fr)]">
              <section className={`${panelClass} p-3`}>
                <h2 className="m-0 shrink-0 font-sans text-[0.72rem] font-semibold tracking-[0.08em] text-[#71717a] uppercase">
                  {t('documents.images')}
                </h2>
                {pages.length === 0 ? (
                  <p className="mt-3 mb-0 font-sans text-[0.8rem] leading-5 text-[#71717a]">
                    {t('documents.noImages')}
                  </p>
                ) : (
                  <ol className="mt-3 mb-0 grid min-h-0 flex-1 list-none gap-1.5 overflow-y-auto p-0">
                    {pages.map((page) => {
                      const label = t('documents.image', { n: page.page_number })
                      const selected = page.id === selectedId
                      const rating = pageRatings[page.id]
                      return (
                        <li key={page.id}>
                          <button
                            type="button"
                            className={`flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left font-sans text-[0.8rem] ${selected ? 'bg-[#f4f4f5] font-semibold text-[#18181b] shadow-[inset_0_0_0_1px_#e4e4e7]' : 'text-[#3f3f46] hover:bg-[#fafafa]'}`}
                            aria-pressed={selected}
                            onClick={() => setSelectedId(page.id)}
                          >
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white font-sans text-[0.7rem] font-semibold text-[#3f3f46] shadow-[0_1px_2px_rgba(23,28,51,0.08)]">
                              {page.page_number}
                            </span>
                            <span className="flex min-w-0 flex-col">
                              {label}
                              {rating !== undefined && (
                                <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-normal text-[#71717a]">
                                  <span
                                    className="size-2 shrink-0 rounded-full"
                                    style={{
                                      backgroundColor: rating
                                        ? levelColors[rating.level].stroke
                                        : '#d4d4d8',
                                    }}
                                    aria-hidden="true"
                                  />
                                  {rating
                                    ? t('documents.confidence', {
                                        value: confidencePercent(rating.average),
                                      })
                                    : t('documents.notTranscribed')}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </section>
              <section className={`${panelClass} p-3`}>
                {shownText && lines.length > 0 && <PageRating lines={lines} />}
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-white">
                  {selectedId && (
                    <PageImage
                      key={selectedId}
                      src={imageSrc}
                      alt={t('documents.image', {
                        n: pages.find((page) => page.id === selectedId)?.page_number ?? '',
                      })}
                      size={imageSize}
                      lines={lines}
                      activeIndex={activeIndex}
                      onHover={(index) => hoverLine('image', index)}
                      onOpen={openLine}
                    />
                  )}
                </div>
                {selectedId && (needsWork(shownText) || isPending) && (
                  <div className="mt-3 flex shrink-0 justify-center">
                    <button
                      type="button"
                      className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-4 font-sans text-[0.8rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => {
                        void transcribe()
                      }}
                      disabled={!selectedId || isPending || documentJob !== null}
                    >
                      {isPending && (
                        <span
                          className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                          aria-hidden="true"
                        />
                      )}
                      {isPending ? t('documents.transcribing') : t('documents.transcribe')}
                    </button>
                  </div>
                )}
              </section>
              <section className={`${panelClass} p-5`}>
                <h2 className="m-0 shrink-0 font-sans text-[0.72rem] font-semibold tracking-[0.08em] text-[#71717a] uppercase">
                  {t('documents.transcription')}
                </h2>
                {hasBoxes && (
                  <div className="mt-3">
                    <LineSource src={imageSrc} size={imageSize} line={activeLine} />
                  </div>
                )}
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto font-sans text-[0.98rem] leading-7 break-words whitespace-pre-wrap text-[#27272a]">
                  {failed ? (
                    <p className="m-0 text-[#71717a]" role="alert">
                      {t('errors.transcriptionFailed')}
                    </p>
                  ) : waiting ? (
                    <p className="m-0 text-[#71717a]">{t('documents.transcribing')}</p>
                  ) : shownText && shownText.text !== '' ? (
                    <ol className="m-0 grid list-none gap-0.5 p-0">
                      {lines.map((line) => (
                        <TranscriptionLine
                          key={line.index}
                          line={line}
                          active={line.index === activeIndex}
                          reveal={hovered?.from === 'image'}
                          onHover={(index) => hoverLine('text', index)}
                          onOpen={openLine}
                        />
                      ))}
                    </ol>
                  ) : shownText === undefined && selectedId ? (
                    <p className="m-0 text-[#71717a]">{t('common.loading')}</p>
                  ) : (
                    <p className="m-0 text-[#a1a1aa]">{t('documents.transcriptionEmpty')}</p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      {openedIndex !== null && (
        <LineDialog
          src={imageSrc}
          size={imageSize}
          lines={lines}
          index={openedIndex}
          onNavigate={openLine}
          onClose={() => setOpened(null)}
        />
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-[rgba(23,28,51,0.35)] p-4"
          onMouseDown={closeDialog}
        >
          <form
            className="w-[min(440px,100%)] rounded-2xl bg-white p-5 shadow-[0_24px_50px_rgba(23,28,51,0.16)] sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 className="m-0 font-sans text-[1.15rem] font-bold text-[#171c33]">
              {t('documents.upload')}
            </h2>
            <p className="mt-1 mb-0 font-sans text-[0.9rem] leading-6 text-[#5d657c]">
              {t('documents.dropHint')}
            </p>
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              accept=".zip,application/zip"
              onChange={(event) => takeFile(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className={`mt-5 flex min-h-40 w-full cursor-pointer items-center justify-center rounded-2xl border border-dashed px-4 text-center font-sans text-[0.95rem] break-all ${isOver ? 'border-[#514fec] bg-[#f5f6ff] text-[#312e81]' : 'border-[#d4d8e6] bg-[#fafafe] text-[#5d657c]'}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => {
                event.preventDefault()
                setIsOver(true)
              }}
              onDragLeave={() => setIsOver(false)}
              onDrop={onDrop}
            >
              {file ? file.name : t('documents.drop')}
            </button>
            {formError && (
              <p className="mt-3 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">
                {formError}
              </p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.9rem] font-bold text-[#4338a8]"
                onClick={closeDialog}
                disabled={isSaving}
              >
                {t('documents.cancel')}
              </button>
              <button
                type="submit"
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-4 font-sans text-[0.9rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
              >
                {isSaving ? t('documents.uploading') : t('documents.upload')}
              </button>
            </div>
          </form>
        </div>
      )}
    </DocumentsFrame>
  )
}
