import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { createDocument } from '../../api/documents'
import type { ErrorKey } from '../../i18n'

const fieldClass =
  'mt-2 w-full rounded-xl border border-[#dccdb3] bg-[#fcf8f0] px-3.5 py-3 font-sans text-base font-normal text-[#2a1d10] outline-none placeholder:text-[#a8957b] focus:border-[#8a5a2b] focus:bg-[#fffdf8] focus:shadow-[0_0_0_3px_rgba(138,90,43,0.12)]'

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
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-[#e8dcc8] bg-[#fffdf8] p-6 text-left whitespace-normal text-[#2a1d10] shadow-[0_24px_60px_rgba(42,29,16,0.18)] backdrop:bg-[#2a1d10]/40 sm:p-8"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <h2
        id="document-dialog-title"
        className="m-0 font-serif text-[1.4rem] leading-tight font-semibold text-[#2a1d10]"
      >
        {t('documents.create')}
      </h2>
      <p className="mt-2 mb-0 font-sans text-[0.95rem] leading-6 text-[#6b5a45]">
        {t('documents.createHint')}
      </p>
      <form className="mt-6" onSubmit={handleSubmit}>
        <label className="block font-sans text-[0.85rem] font-semibold text-[#33251a]">
          {t('documents.name')}
          <input
            className={fieldClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
          />
        </label>
        <label className="mt-5 block font-sans text-[0.85rem] font-semibold text-[#33251a]">
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
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#dfcfb2] bg-[#fffdf8] px-5 font-sans text-[0.95rem] font-bold text-[#7a4d22]"
            onClick={() => dialogRef.current?.close()}
          >
            {t('documents.cancel')}
          </button>
          <button
            type="submit"
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[#8a5a2b] hover:bg-[#6e4520] px-5 font-sans text-[0.95rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
          >
            {t('documents.save')}
          </button>
        </div>
      </form>
    </dialog>
  )
}
