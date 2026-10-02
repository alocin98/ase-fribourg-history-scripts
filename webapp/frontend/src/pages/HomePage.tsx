import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { documentTitle, listDocuments, type DocumentSummary } from '../api/documents'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; documents: DocumentSummary[] }

// Liste des documents de l'utilisateur connecté.
export default function HomePage() {
  const { t, i18n } = useTranslation()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    listDocuments()
      .then((documents) => setState({ status: 'ready', documents }))
      .catch(() => setState({ status: 'error' }))
  }, [])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.resolvedLanguage, { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-3xl px-4 py-8 md:px-10 md:py-10">
      <h1 className="text-2xl font-bold">{t('documents.title')}</h1>

      {/* La création de documents n'est pas encore développée : on l'annonce sans bouton. */}
      <p className="mt-4 rounded-md bg-accent-soft px-4 py-3 text-sm leading-relaxed text-ink">{t('documents.creationPending')}</p>

      {state.status === 'loading' && <p className="mt-8 text-muted">{t('documents.loading')}</p>}
      {state.status === 'error' && <p className="mt-8 text-red-700">{t('documents.loadError')}</p>}
      {state.status === 'ready' && state.documents.length === 0 && (
        <p className="mt-8 text-muted">{t('documents.empty')}</p>
      )}

      {state.status === 'ready' && state.documents.length > 0 && (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-md border border-line bg-white">
          {state.documents.map((document) => (
            <li key={document.id} className="flex flex-col gap-0.5 px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <span className="font-medium break-all">{documentTitle(document)}</span>
              <span className="shrink-0 text-sm text-muted">
                {t('documents.uploaded', { date: formatDate(document.uploaded_at) })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
