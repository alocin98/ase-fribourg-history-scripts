import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../api/client'
import {
  deleteStoredDocument,
  getLocalDocument,
  listDocuments,
  listPages,
  rememberUpload,
  uploadDocument,
  type DocumentPage,
  type LocalDocument,
} from '../../api/documents'
import { useAuth } from '../../auth/AuthProvider'
import DocumentActions from './DocumentActions'
import DocumentsFrame from './DocumentsFrame'

// Liste des images à gauche. La colonne de droite reste vide pour la transcription.
export default function DocumentOverviewPage() {
  const { t } = useTranslation()
  const { documentId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [document, setDocument] = useState<LocalDocument | null | undefined>(undefined)
  const [remoteName, setRemoteName] = useState<string | null>(null)
  const [pages, setPages] = useState<DocumentPage[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isOver, setIsOver] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState(false)

  const loadPages = async (uploadId: string | null) => {
    if (!uploadId) {
      setPages([])
      return
    }
    setPages(await listPages(uploadId))
  }

  useEffect(() => {
    let cancelled = false
    setDocument(undefined)
    setRemoteName(null)
    setPages([])
    const local = user ? getLocalDocument(user.id, documentId) : null
    if (local) {
      setDocument(local)
      loadPages(local.uploadId).catch(() => {
        if (!cancelled) setPages([])
      })
      return () => {
        cancelled = true
      }
    }
    listDocuments()
      .then(async (items) => {
        const found = items.find((item) => item.id === documentId) ?? null
        if (cancelled) return
        setDocument(null)
        setRemoteName(found?.original_filename ?? null)
        if (!found) return
        setPages(await listPages(found.id))
      })
      .catch(() => {
        if (!cancelled) {
          setDocument(null)
          setRemoteName(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [documentId, user])

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
      const created = await uploadDocument(file)
      if (user && document) {
        rememberUpload(user.id, document.id, created.id)
        setDocument({ ...document, uploadId: created.id })
        await loadPages(created.id)
        closeDialog()
        return
      }
      closeDialog()
      navigate(`/app/documents/${created.id}/overview`)
    } catch (error) {
      const invalid = error instanceof ApiError && (error.status === 400 || error.status === 413)
      setFormError(t(invalid ? 'errors.invalidZip' : 'errors.server'))
      setIsSaving(false)
    }
  }

  const title = document?.title ?? remoteName
  const missing = document === null && remoteName === null && document !== undefined

  return (
    <DocumentsFrame>
      <main className="flex min-h-full flex-col px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        {document === undefined && remoteName === null ? (
          <p className="m-0 font-sans text-[1rem] text-[#5d657c]">{t('common.loading')}</p>
        ) : missing ? (
          <p className="m-0 font-sans text-[1rem] text-[#5d657c]">{t('documents.missing')}</p>
        ) : (
          <>
            <div className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="m-0 font-sans text-[clamp(1.45rem,3vw,1.85rem)] leading-tight font-bold tracking-[-0.03em] break-words text-[#171c33]">{title}</h1>
                {document?.description && (
                  <p className="mt-2 mb-0 max-w-full min-w-0 font-sans text-[0.98rem] leading-7 break-words whitespace-pre-wrap text-[#5d657c]">{document.description}</p>
                )}
              </div>
              <div className="flex w-full shrink-0 flex-nowrap items-center gap-2 sm:w-auto sm:justify-end">
                <DocumentActions
                  id={documentId}
                  editable={Boolean(document)}
                  onRemove={() => {
                    if (!user) return
                    setDeleteError(false)
                    void deleteStoredDocument(user.id, documentId)
                      .then(() => navigate('/app/documents'))
                      .catch(() => setDeleteError(true))
                  }}
                />
                <button
                  type="button"
                  className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white"
                  onClick={() => setIsOpen(true)}
                >
                  {t('documents.upload')}
                </button>
              </div>
            </div>
            {deleteError && <p className="mt-4 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">{t('errors.deleteFailed')}</p>}
            <div className="mt-8 grid min-h-80 flex-1 grid-cols-1 items-stretch gap-4 min-[700px]:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.15fr)]">
              <section className="rounded-2xl border border-[#e6e8f2] bg-white p-4 sm:p-5">
                <h2 className="m-0 font-sans text-[0.95rem] font-semibold text-[#171c33]">{t('documents.images')}</h2>
                {pages.length === 0 ? (
                  <p className="mt-4 mb-0 font-sans text-[0.95rem] leading-6 text-[#5d657c]">{t('documents.noImages')}</p>
                ) : (
                  <ol className="mt-3 mb-0 grid list-none gap-2 p-0">
                    {pages.map((page) => (
                      <li key={page.id} className="flex items-center gap-3 rounded-xl bg-[#f5f6fa] px-3 py-2.5 font-sans text-[0.95rem] text-[#3d4663]">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white font-sans text-[0.8rem] font-semibold text-[#4338a8]">{page.page_number}</span>
                        {t('documents.image', { n: page.page_number })}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              <section className="min-h-56 rounded-2xl border border-[#e6e8f2] bg-white" />
            </div>
          </>
        )}
      </main>

      {isOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(23,28,51,0.35)] p-4" onMouseDown={closeDialog}>
          <form
            className="w-[min(440px,100%)] rounded-2xl bg-white p-5 shadow-[0_24px_50px_rgba(23,28,51,0.16)] sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 className="m-0 font-sans text-[1.15rem] font-bold text-[#171c33]">{t('documents.upload')}</h2>
            <p className="mt-1 mb-0 font-sans text-[0.9rem] leading-6 text-[#5d657c]">{t('documents.dropHint')}</p>
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
            {formError && <p className="mt-3 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">{formError}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.9rem] font-bold text-[#4338a8]" onClick={closeDialog} disabled={isSaving}>
                {t('documents.cancel')}
              </button>
              <button type="submit" className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-4 font-sans text-[0.9rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving}>
                {isSaving ? t('documents.uploading') : t('documents.upload')}
              </button>
            </div>
          </form>
        </div>
      )}
    </DocumentsFrame>
  )
}
