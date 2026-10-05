import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { deleteStoredDocument } from '../../api/documents'
import { useAuth } from '../../auth/AuthProvider'
import DocumentActions from './DocumentActions'
import DocumentsFrame, { useDocuments, type MenuDocument } from './DocumentsFrame'

type Display = 'icons' | 'table'

const DISPLAY_KEY = 'ase_documents_display'
const PAGE_SIZE: Record<Display, number> = { icons: 24, table: 10 }

function readDisplay(): Display {
  const saved = localStorage.getItem(DISPLAY_KEY)
  return saved === 'icons' || saved === 'small' || saved === 'medium' ? 'icons' : 'table'
}

function DocumentsContent() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const documents = useDocuments()
  const [display, setDisplay] = useState<Display>(readDisplay)
  const [page, setPage] = useState(1)
  const [goneIds, setGoneIds] = useState<string[]>([])
  const [removeError, setRemoveError] = useState(false)

  const choose = (next: Display) => {
    setDisplay(next)
    setPage(1)
    localStorage.setItem(DISPLAY_KEY, next)
  }

  const remove = async (documentId: string) => {
    if (!user || goneIds.includes(documentId)) return
    setRemoveError(false)
    setGoneIds((ids) => [...ids, documentId])
    try {
      await deleteStoredDocument(user.id, documentId)
    } catch {
      setGoneIds((ids) => ids.filter((id) => id !== documentId))
      setRemoveError(true)
    }
  }

  const listed = documents?.filter((document) => !goneIds.includes(document.id)) ?? null
  const total = listed?.length ?? 0
  const pageSize = PAGE_SIZE[display]
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  const visible = listed?.slice(start, start + pageSize) ?? []
  const actionsFor = (document: MenuDocument) => (
    <DocumentActions
      id={document.id}
      editable={document.editable}
      onRemove={() => { void remove(document.id) }}
    />
  )

  return (
    <main className="px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 font-sans text-[clamp(1.45rem,3vw,1.85rem)] leading-tight font-bold tracking-[-0.03em] text-[#171c33]">{t('documents.title')}</h1>
          <p className="mt-2 mb-0 max-w-xl font-sans text-[0.98rem] leading-7 text-[#5d657c]">{t('documents.intro')}</p>
        </div>
        <div className="flex w-fit max-w-full flex-wrap items-center gap-5" role="group" aria-label={t('documents.display')}>
          {(['table', 'icons'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={display === mode}
              className={`cursor-pointer border-0 border-b-2 bg-transparent px-0.5 pb-1 font-sans text-[0.82rem] font-bold ${display === mode ? 'border-[#514fec] text-[#312e81]' : 'border-transparent text-[#5d657c] hover:text-[#312e81]'}`}
              onClick={() => choose(mode)}
            >
              {t(mode === 'table' ? 'documents.asTable' : 'documents.asIcons')}
            </button>
          ))}
        </div>
      </div>

      {removeError && <p className="mt-4 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">{t('errors.deleteFailed')}</p>}

      {listed?.length === 0 && (
        <p className="mt-10 mb-0 max-w-md font-sans text-[1rem] leading-7 text-[#5d657c]">{t('documents.empty')}</p>
      )}

      {display === 'table' && visible.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-[#e6e8f2] bg-white">
          <table className="w-full min-w-[36rem] table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-[#eef0f6]">
                <th className="w-[28%] px-4 py-3 font-sans text-[0.75rem] font-bold tracking-[0.06em] text-[#8b93a7] uppercase">{t('documents.name')}</th>
                <th className="px-4 py-3 font-sans text-[0.75rem] font-bold tracking-[0.06em] text-[#8b93a7] uppercase">{t('documents.description')}</th>
                <th className="w-36 px-4 py-3 text-right font-sans text-[0.75rem] font-bold tracking-[0.06em] whitespace-nowrap text-[#8b93a7] uppercase">{t('documents.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((document) => (
                <tr key={document.id} className="border-b border-[#f3f4fb] last:border-0">
                  <td className="px-4 py-3 font-sans text-[0.95rem] font-semibold break-words text-[#171c33]">{document.label}</td>
                  <td className="overflow-hidden px-4 py-3 font-sans text-[0.9rem] text-[#5d657c]"><span className="line-clamp-2 break-all">{document.description}</span></td>
                  <td className="w-px px-4 py-3 whitespace-nowrap"><div className="flex justify-end">{actionsFor(document)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {display === 'icons' && visible.length > 0 && (
        <ul className="mt-8 mb-0 grid list-none grid-cols-2 gap-3 p-0 min-[700px]:grid-cols-4 min-[1100px]:grid-cols-6">
          {visible.map((document) => (
            <li key={document.id} className="flex min-h-28 flex-col rounded-xl border border-[#e6e8f2] bg-white p-3">
              <span className="block truncate font-sans text-[0.86rem] font-semibold text-[#171c33]">{document.label}</span>
              <div className="mt-auto pt-3">{actionsFor(document)}</div>
            </li>
          ))}
        </ul>
      )}

      {total > pageSize && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 font-sans text-[0.85rem] text-[#5d657c]">{t('documents.range', { from: start + 1, to: Math.min(start + pageSize, total), total })}</p>
          <div className="flex gap-2">
            <button type="button" className="inline-flex h-10 cursor-pointer items-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setPage(current - 1)} disabled={current === 1}>{t('documents.previous')}</button>
            <button type="button" className="inline-flex h-10 cursor-pointer items-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setPage(current + 1)} disabled={current === pageCount}>{t('documents.next')}</button>
          </div>
        </div>
      )}
    </main>
  )
}

export default function DocumentsPage() {
  return (
    <DocumentsFrame>
      <DocumentsContent />
    </DocumentsFrame>
  )
}
