import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { deleteDocument, isDocumentOwner, type StoredDocument } from '../../api/documents'
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

function accessLabel(document: StoredDocument, viewer: string, editor: string): string | null {
  if (document.access === 'viewer') return viewer
  if (document.access === 'editor') return editor
  return null
}

function DocumentsContent() {
  const { t } = useTranslation()
  const { owned, shared } = useDocuments()
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

  const listed = owned?.filter((document) => !goneIds.includes(document.id)) ?? null
  const sharedList = shared ?? null
  const total = listed?.length ?? 0
  const pageSize = PAGE_SIZE[display]
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  const visible = listed?.slice(start, start + pageSize) ?? []

  const titleLink = (document: StoredDocument) => (
    <Link
      className="font-semibold text-[#4338a8] underline decoration-[#c7d2fe] underline-offset-[3px] hover:text-[#312e81]"
      to={`/app/documents/${document.id}/overview`}
    >
      {document.name}
    </Link>
  )

  const actionsFor = (document: StoredDocument) => (
    <DocumentActions
      id={document.id}
      showRemove={isDocumentOwner(document)}
      onRemove={() => {
        void remove(document.id)
      }}
    />
  )

  const metaFor = (document: StoredDocument) => {
    const access = accessLabel(document, t('documents.accessViewer'), t('documents.accessEditor'))
    if (document.owner_name) {
      return (
        <span className="text-[0.75rem] text-[#71717a]">
          {t('documents.sharedBy', { name: document.owner_name })}
          {access ? ` · ${access}` : ''}
        </span>
      )
    }
    if (access) return <span className="text-[0.75rem] text-[#71717a]">{access}</span>
    return null
  }

  const renderTable = (items: StoredDocument[]) => (
    <div className="overflow-x-auto rounded-2xl border border-[#e6e8f2] bg-white">
      <table className="w-full min-w-[36rem] table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-[#eef0f6]">
            <th className="w-[34%] px-4 py-3 text-left align-top font-sans text-[0.75rem] font-bold tracking-[0.06em] text-[#8b93a7] uppercase">
              {t('documents.name')}
            </th>
            <th className="px-4 py-3 text-left align-top font-sans text-[0.75rem] font-bold tracking-[0.06em] text-[#8b93a7] uppercase">
              {t('documents.description')}
            </th>
            <th className="w-36 px-4 py-3 text-right align-top font-sans text-[0.75rem] font-bold tracking-[0.06em] whitespace-nowrap text-[#8b93a7] uppercase">
              {t('documents.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((document) => (
            <tr key={document.id} className="border-b border-[#f3f4fb] last:border-0">
              <td className="px-4 py-3 align-top font-sans text-[0.95rem] break-words">
                <div className="flex flex-col gap-1">
                  {titleLink(document)}
                  {metaFor(document)}
                </div>
              </td>
              <td className="px-4 py-3 align-top font-sans text-[0.9rem] break-words text-[#5d657c]">
                <span className="line-clamp-2">{document.description}</span>
              </td>
              <td className="w-36 px-4 py-3 align-top whitespace-nowrap">
                <div className="flex justify-end">{actionsFor(document)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderIcons = (items: StoredDocument[]) => (
    <ul className="mb-0 grid list-none grid-cols-2 gap-3 p-0 min-[700px]:grid-cols-4 min-[1100px]:grid-cols-6">
      {items.map((document) => (
        <li
          key={document.id}
          className="flex min-h-28 flex-col rounded-xl border border-[#e6e8f2] bg-white p-3"
        >
          <span className="block truncate font-sans text-[0.86rem]">{titleLink(document)}</span>
          {metaFor(document) && <div className="mt-1">{metaFor(document)}</div>}
          <p className="mt-1 mb-0 line-clamp-2 font-sans text-[0.78rem] leading-5 break-words text-[#5d657c]">
            {document.description}
          </p>
          <div className="mt-auto pt-3">{actionsFor(document)}</div>
        </li>
      ))}
    </ul>
  )

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden px-5 py-6 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 font-sans text-[clamp(1.45rem,3vw,1.85rem)] leading-tight font-bold tracking-[-0.03em] text-[#171c33]">
            {t('documents.title')}
          </h1>
          <p className="mt-2 mb-0 max-w-xl font-sans text-[0.98rem] leading-7 text-[#5d657c]">
            {t('documents.intro')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-5">
          <div
            className="flex w-fit max-w-full flex-wrap items-center gap-5"
            role="group"
            aria-label={t('documents.display')}
          >
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
          <button
            type="button"
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border-0 bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-4 font-sans text-[0.85rem] font-bold text-white"
            onClick={() => setIsCreating(true)}
          >
            {t('documents.create')}
          </button>
        </div>
      </div>

      {removeError && (
        <p className="mt-4 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">
          {t('errors.deleteFailed')}
        </p>
      )}

      <div className="mt-6 min-h-0 flex-1 overflow-auto">
        {listed?.length === 0 && (
          <p className="mb-8 max-w-md font-sans text-[1rem] leading-7 text-[#5d657c]">
            {t('documents.empty')}
          </p>
        )}

        {display === 'table' && visible.length > 0 && renderTable(visible)}
        {display === 'icons' && visible.length > 0 && renderIcons(visible)}

        {total > pageSize && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 font-sans text-[0.85rem] text-[#5d657c]">
              {t('documents.range', {
                from: start + 1,
                to: Math.min(start + pageSize, total),
                total,
              })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex h-10 cursor-pointer items-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage(current - 1)}
                disabled={current === 1}
              >
                {t('documents.previous')}
              </button>
              <button
                type="button"
                className="inline-flex h-10 cursor-pointer items-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage(current + 1)}
                disabled={current === pageCount}
              >
                {t('documents.next')}
              </button>
            </div>
          </div>
        )}

        <section className="mt-10 border-t border-[#e6e8f2] pt-8">
          <h2 className="m-0 font-sans text-[1.15rem] font-bold tracking-[-0.02em] text-[#171c33]">
            {t('documents.sharedTitle')}
          </h2>
          <p className="mt-2 mb-0 max-w-xl font-sans text-[0.95rem] leading-7 text-[#5d657c]">
            {t('documents.sharedIntro')}
          </p>

          {sharedList === null ? (
            <p className="mt-6 mb-0 font-sans text-[0.95rem] text-[#5d657c]">
              {t('common.loading')}
            </p>
          ) : sharedList.length === 0 ? (
            <p className="mt-6 mb-0 max-w-md font-sans text-[0.95rem] leading-7 text-[#5d657c]">
              {t('documents.sharedEmpty')}
            </p>
          ) : display === 'table' ? (
            <div className="mt-5">{renderTable(sharedList)}</div>
          ) : (
            <div className="mt-5">{renderIcons(sharedList)}</div>
          )}
        </section>
      </div>

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
