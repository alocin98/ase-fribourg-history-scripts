import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { deleteDocument, type StoredDocument } from '../../api/documents'
import DocumentActions from './DocumentActions'
import DocumentsFrame, { useDocuments } from './DocumentsFrame'
import DocumentDialog from './DocumentDialog'

type Display = 'icons' | 'table'

const DISPLAY_KEY = 'ase_documents_display'
const PAGE_SIZE: Record<Display, number> = { icons: 24, table: 10 }

function readDisplay(): Display {
  const saved = localStorage.getItem(DISPLAY_KEY)
  return saved === 'icons' || saved === 'small' || saved === 'medium' ? 'icons' : 'table'
}

function DocumentsContent() {
  const { t } = useTranslation()
  const documents = useDocuments()
  const [display, setDisplay] = useState<Display>(readDisplay)
  const [page, setPage] = useState(1)
  const [goneIds, setGoneIds] = useState<string[]>([])
  const [removeError, setRemoveError] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const choose = (next: Display) => {
    setDisplay(next)
    setPage(1)
    localStorage.setItem(DISPLAY_KEY, next)
  }

  const remove = async (documentId: string) => {
    if (goneIds.includes(documentId)) return
    setRemoveError(false)
    setGoneIds((ids) => [...ids, documentId])
    try {
      await deleteDocument(documentId)
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
  const titleLink = (document: StoredDocument) => (
    <Link className="font-semibold text-[#4338a8] underline decoration-[#c7d2fe] underline-offset-[3px] hover:text-[#312e81]" to={`/app/documents/${document.id}/overview`}>
      {document.name}
    </Link>
  )
  const actionsFor = (document: StoredDocument) => (
    <DocumentActions
      id={document.id}
      onRemove={() => { void remove(document.id) }}
    />
  )

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden px-5 py-6 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 font-sans text-[clamp(1.45rem,3vw,1.85rem)] leading-tight font-bold tracking-[-0.03em] text-[#171c33]">{t('documents.title')}</h1>
          <p className="mt-2 mb-0 max-w-xl font-sans text-[0.98rem] leading-7 text-[#5d657c]">{t('documents.intro')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-5">
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
          <button type="button" className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border-0 bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-4 font-sans text-[0.85rem] font-bold text-white" onClick={() => setIsCreating(true)}>
            {t('documents.create')}
          </button>
        </div>
      </div>

      {removeError && <p className="mt-4 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">{t('errors.deleteFailed')}</p>}

      {listed?.length === 0 && (
        <p className="mt-10 mb-0 max-w-md font-sans text-[1rem] leading-7 text-[#5d657c]">{t('documents.empty')}</p>
      )}

      <div className="mt-6 min-h-0 flex-1 overflow-auto">
      {display === 'table' && visible.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-[#e6e8f2] bg-white">
          <table className="w-full min-w-[36rem] table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-[#eef0f6]">
                <th className="w-[34%] px-4 py-3 text-left align-top font-sans text-[0.75rem] font-bold tracking-[0.06em] text-[#8b93a7] uppercase">{t('documents.name')}</th>
                <th className="px-4 py-3 text-left align-top font-sans text-[0.75rem] font-bold tracking-[0.06em] text-[#8b93a7] uppercase">{t('documents.description')}</th>
                <th className="w-36 px-4 py-3 text-right align-top font-sans text-[0.75rem] font-bold tracking-[0.06em] whitespace-nowrap text-[#8b93a7] uppercase">{t('documents.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((document) => (
                <tr key={document.id} className="border-b border-[#f3f4fb] last:border-0">
                  <td className="px-4 py-3 align-top font-sans text-[0.95rem] break-words">{titleLink(document)}</td>
                  <td className="px-4 py-3 align-top font-sans text-[0.9rem] break-words text-[#5d657c]"><span className="line-clamp-2">{document.description}</span></td>
                  <td className="w-36 px-4 py-3 align-top whitespace-nowrap"><div className="flex justify-end">{actionsFor(document)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {display === 'icons' && visible.length > 0 && (
        <ul className="mb-0 grid list-none grid-cols-2 gap-3 p-0 min-[700px]:grid-cols-4 min-[1100px]:grid-cols-6">
          {visible.map((document) => (
            <li key={document.id} className="flex min-h-28 flex-col rounded-xl border border-[#e6e8f2] bg-white p-3">
              <span className="block truncate font-sans text-[0.86rem]">{titleLink(document)}</span>
              <p className="mt-1 mb-0 line-clamp-2 font-sans text-[0.78rem] leading-5 break-words text-[#5d657c]">{document.description}</p>
              <div className="mt-auto pt-3">{actionsFor(document)}</div>
            </li>
          ))}
        </ul>
      )}
      </div>

      {total > pageSize && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 font-sans text-[0.85rem] text-[#5d657c]">{t('documents.range', { from: start + 1, to: Math.min(start + pageSize, total), total })}</p>
          <div className="flex gap-2">
            <button type="button" className="inline-flex h-10 cursor-pointer items-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setPage(current - 1)} disabled={current === 1}>{t('documents.previous')}</button>
            <button type="button" className="inline-flex h-10 cursor-pointer items-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setPage(current + 1)} disabled={current === pageCount}>{t('documents.next')}</button>
          </div>
        </div>
      )}

      {isCreating && <DocumentDialog onClose={() => setIsCreating(false)} />}
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
