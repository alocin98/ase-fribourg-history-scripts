import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { createDocument } from '../../api/documents'
import type { ErrorKey } from '../../i18n'

const fieldClass =
  'mt-2 w-full rounded-xl border border-[#d4d8e6] bg-[#fafafe] px-3.5 py-3 font-sans text-base font-normal text-[#172033] outline-none placeholder:text-[#98a2b3] focus:border-[#4f46e5] focus:bg-white focus:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]'

// Fenêtre modale native pour créer un document.
// Le parent la monte à l'ouverture et la démonte dans `onClose`. Échap et un clic sur le fond la ferment.
export default function DocumentDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<ErrorKey | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextTitle = title.trim()
    const nextDescription = description.trim()
    if (!nextTitle || !nextDescription) {
      setError('errors.requiredFields')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const created = await createDocument(nextTitle, nextDescription)
      navigate(`/app/documents/${created.id}/overview`)
    } catch {
      setError('errors.server')
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="document-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-[#e6e8f2] bg-white p-6 text-left whitespace-normal text-[#172033] shadow-[0_24px_60px_rgba(23,28,51,0.18)] backdrop:bg-[#171c33]/40 sm:p-8"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <h2
        id="document-dialog-title"
        className="m-0 font-sans text-[1.4rem] leading-tight font-bold tracking-[-0.02em] text-[#171c33]"
      >
        {t('documents.create')}
      </h2>
      <p className="mt-2 mb-0 font-sans text-[0.95rem] leading-6 text-[#5d657c]">
        {t('documents.createHint')}
      </p>
      <form className="mt-6" onSubmit={handleSubmit}>
        <label className="block font-sans text-[0.85rem] font-semibold text-[#1c2440]">
          {t('documents.name')}
          <input
            className={fieldClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
          />
        </label>
        <label className="mt-5 block font-sans text-[0.85rem] font-semibold text-[#1c2440]">
          {t('documents.description')}
          <textarea
            className={`${fieldClass} min-h-32 resize-y`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        {error && (
          <p className="mt-4 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">
            {t(error)}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#d9ddf5] bg-white px-5 font-sans text-[0.95rem] font-bold text-[#4338a8]"
            onClick={() => dialogRef.current?.close()}
          >
            {t('documents.cancel')}
          </button>
          <button
            type="submit"
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-5 font-sans text-[0.95rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
          >
            {t('documents.save')}
          </button>
        </div>
      </form>
    </dialog>
  )
}
