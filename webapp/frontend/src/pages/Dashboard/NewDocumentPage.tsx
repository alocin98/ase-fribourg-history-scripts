import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { createLocalDocument } from '../../api/documents'
import { useAuth } from '../../auth/AuthProvider'
import DocumentsFrame from './DocumentsFrame'

const fieldClass = 'mt-2 w-full rounded-xl border border-[#d4d8e6] bg-[#fafafe] px-3.5 py-3 font-sans text-base font-normal text-[#172033] outline-none placeholder:text-[#98a2b3] focus:border-[#4f46e5] focus:bg-white focus:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]'

export default function NewDocumentPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [showError, setShowError] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextTitle = title.trim()
    const nextDescription = description.trim()
    if (!user || !nextTitle || !nextDescription) {
      setShowError(true)
      return
    }
    const created = createLocalDocument(user.id, nextTitle, nextDescription)
    navigate(`/app/documents/${created.id}/overview`)
  }

  return (
    <DocumentsFrame>
      <main className="px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <h1 className="m-0 font-sans text-[clamp(1.45rem,3vw,1.85rem)] leading-tight font-bold tracking-[-0.03em] text-[#171c33]">{t('documents.create')}</h1>
        <p className="mt-2 mb-0 max-w-xl font-sans text-[0.98rem] leading-7 text-[#5d657c]">{t('documents.createHint')}</p>
        <form className="mt-8 w-full max-w-xl" onSubmit={handleSubmit}>
          <label className="block font-sans text-[0.85rem] font-semibold text-[#1c2440]">
            {t('documents.name')}
            <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </label>
          <label className="mt-5 block font-sans text-[0.85rem] font-semibold text-[#1c2440]">
            {t('documents.description')}
            <textarea className={`${fieldClass} min-h-32 resize-y`} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          {showError && <p className="mt-4 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">{t('errors.requiredFields')}</p>}
          <button type="submit" className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-5 font-sans text-[0.95rem] font-bold text-white sm:w-fit">
            {t('documents.save')}
          </button>
        </form>
      </main>
    </DocumentsFrame>
  )
}
