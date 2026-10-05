import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getLocalDocument, updateLocalDocument } from '../../api/documents'
import { useAuth } from '../../auth/AuthProvider'
import DocumentsFrame from './DocumentsFrame'

const fieldClass = 'mt-2 w-full rounded-xl border border-[#d4d8e6] bg-[#fafafe] px-3.5 py-3 font-sans text-base font-normal text-[#172033] outline-none focus:border-[#4f46e5] focus:bg-white focus:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]'

export default function EditDocumentPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { documentId = '' } = useParams()
  const { user } = useAuth()
  const current = user ? getLocalDocument(user.id, documentId) : null
  const [title, setTitle] = useState(current?.title ?? '')
  const [description, setDescription] = useState(current?.description ?? '')
  const [showError, setShowError] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextTitle = title.trim()
    const nextDescription = description.trim()
    if (!user || !current || !nextTitle || !nextDescription) {
      setShowError(true)
      return
    }
    updateLocalDocument(user.id, current.id, nextTitle, nextDescription)
    navigate(`/app/documents/${current.id}/overview`)
  }

  return (
    <DocumentsFrame>
      <main className="px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        {current ? (
          <>
            <h1 className="m-0 font-sans text-[clamp(1.45rem,3vw,1.85rem)] leading-tight font-bold tracking-[-0.03em] text-[#171c33]">{t('documents.editTitle')}</h1>
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
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#d9ddf5] bg-white px-5 font-sans text-[0.95rem] font-bold text-[#4338a8]" onClick={() => navigate(`/app/documents/${current.id}/overview`)}>
                  {t('documents.cancel')}
                </button>
                <button type="submit" className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-5 font-sans text-[0.95rem] font-bold text-white">
                  {t('documents.save')}
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="m-0 font-sans text-[1rem] text-[#5d657c]">{t('documents.missing')}</p>
        )}
      </main>
    </DocumentsFrame>
  )
}
