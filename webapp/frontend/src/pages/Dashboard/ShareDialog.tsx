import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../api/client'
import {
  listDocumentShares,
  removeDocumentShare,
  shareDocument,
  updateDocumentShare,
  type DocumentShare,
  type ShareRole,
} from '../../api/documents'

const fieldClass =
  'mt-1 w-full rounded-lg border border-[#d4d8e6] bg-white px-3 py-2 font-sans text-[0.95rem] font-normal text-[#172033] outline-none placeholder:text-[#98a2b3] focus:border-[#4f46e5] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]'
const primaryButton =
  'inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-4 font-sans text-[0.82rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60'
const neutralButton =
  'inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white disabled:cursor-not-allowed disabled:opacity-60'

type Props = {
  documentId: string
  onClose: () => void
}

export default function ShareDialog({ documentId, onClose }: Props) {
  const { t } = useTranslation()
  const [shares, setShares] = useState<DocumentShare[] | null>(null)
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<ShareRole>('viewer')
  const [isSaving, setIsSaving] = useState(false)
  const [busyShareId, setBusyShareId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listDocumentShares(documentId)
      .then((items) => {
        if (!cancelled) setShares(items)
      })
      .catch(() => {
        if (!cancelled) {
          setShares([])
          setError(t('errors.shareLoadFailed'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [documentId, t])

  const mapError = (error: unknown): string => {
    if (error instanceof ApiError) {
      if (error.status === 404) return t('errors.shareUserNotFound')
      if (error.status === 409) return t('errors.shareAlreadyExists')
      if (error.status === 400) return t('errors.shareInvalid')
    }
    return t('errors.shareFailed')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextUsername = username.trim()
    if (!nextUsername) {
      setError(t('errors.requiredFields'))
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const created = await shareDocument(documentId, nextUsername, role)
      setShares((current) => [...(current ?? []), created])
      setUsername('')
      setRole('viewer')
    } catch (shareError) {
      setError(mapError(shareError))
    } finally {
      setIsSaving(false)
    }
  }

  const changeRole = async (share: DocumentShare, nextRole: ShareRole) => {
    if (share.role === nextRole || busyShareId) return
    setBusyShareId(share.id)
    setError(null)
    try {
      const updated = await updateDocumentShare(documentId, share.id, nextRole)
      setShares((current) => (current ?? []).map((item) => (item.id === share.id ? updated : item)))
    } catch (shareError) {
      setError(mapError(shareError))
    } finally {
      setBusyShareId(null)
    }
  }

  const removeShare = async (share: DocumentShare) => {
    if (busyShareId) return
    setBusyShareId(share.id)
    setError(null)
    try {
      await removeDocumentShare(documentId, share.id)
      setShares((current) => (current ?? []).filter((item) => item.id !== share.id))
    } catch (shareError) {
      setError(mapError(shareError))
    } finally {
      setBusyShareId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-[rgba(23,28,51,0.35)] p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[min(36rem,calc(100dvh-2rem))] w-[min(480px,100%)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_50px_rgba(23,28,51,0.16)]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
      >
        <div className="shrink-0 border-b border-[#eef0f6] px-5 py-4 sm:px-6">
          <h2
            id="share-dialog-title"
            className="m-0 font-sans text-[1.15rem] font-bold text-[#171c33]"
          >
            {t('documents.share.title')}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
            onSubmit={handleSubmit}
          >
            <label className="block min-w-0 font-sans text-[0.82rem] font-semibold text-[#1c2440]">
              {t('documents.share.username')}
              <input
                className={fieldClass}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="off"
                name="share-username"
                placeholder={t('documents.share.usernamePlaceholder')}
                disabled={isSaving}
              />
            </label>
            <label className="block font-sans text-[0.82rem] font-semibold text-[#1c2440]">
              {t('documents.share.role')}
              <select
                className={fieldClass}
                value={role}
                onChange={(event) => setRole(event.target.value as ShareRole)}
                disabled={isSaving}
              >
                <option value="viewer">{t('documents.share.viewer')}</option>
                <option value="editor">{t('documents.share.editor')}</option>
              </select>
            </label>
            <button
              type="submit"
              className={`${primaryButton} w-full sm:w-auto`}
              disabled={isSaving}
            >
              {isSaving ? t('documents.share.sharing') : t('documents.share.add')}
            </button>
          </form>

          {error && (
            <p className="mt-3 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">
              {error}
            </p>
          )}

          {shares === null ? (
            <p className="mt-5 mb-0 font-sans text-[0.9rem] text-[#5d657c]">
              {t('common.loading')}
            </p>
          ) : shares.length > 0 ? (
            <ul className="mt-5 mb-0 grid list-none gap-2 p-0">
              {shares.map((share) => (
                <li
                  key={share.id}
                  className="flex flex-col gap-2 rounded-xl border border-[#eef0f6] bg-[#f8f9fc] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 truncate font-sans text-[0.9rem] font-semibold text-[#171c33]">
                    {share.username}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="h-8 rounded-full border border-[#d9ddf5] bg-white px-2.5 font-sans text-[0.75rem] font-bold text-[#4338a8] outline-none disabled:opacity-60"
                      value={share.role}
                      disabled={busyShareId === share.id}
                      aria-label={t('documents.share.roleFor', { username: share.username })}
                      onChange={(event) => {
                        void changeRole(share, event.target.value as ShareRole)
                      }}
                    >
                      <option value="viewer">{t('documents.share.viewer')}</option>
                      <option value="editor">{t('documents.share.editor')}</option>
                    </select>
                    <button
                      type="button"
                      className="inline-flex h-8 cursor-pointer items-center rounded-full border border-[#f3d0d0] bg-white px-2.5 font-sans text-[0.75rem] font-bold text-[#dc2626] hover:border-[#dc2626] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={busyShareId === share.id}
                      onClick={() => {
                        void removeShare(share)
                      }}
                    >
                      {t('documents.share.remove')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end border-t border-[#eef0f6] px-5 py-3 sm:px-6">
          <button type="button" className={neutralButton} onClick={onClose}>
            {t('documents.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
