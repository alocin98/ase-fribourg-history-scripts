import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  searchTranscriptions,
  type TranscriptionSearchHit,
} from '../../api/transcription'

const DEBOUNCE_MS = 300

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim()
  if (!trimmed) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, 'gi'))
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={`${part}-${index}`}
            className="rounded-[0.2rem] bg-[#fde68a] px-0.5 text-inherit"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  )
}

export default function TranscriptionSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [hits, setHits] = useState<TranscriptionSearchHit[]>([])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setHits([])
      setLoading(false)
      setError(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(false)
    const timer = window.setTimeout(() => {
      void searchTranscriptions(trimmed, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return
          setHits(results)
          setOpen(true)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setHits([])
          setError(true)
          setOpen(true)
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [])

  const openHit = (hit: TranscriptionSearchHit) => {
    setOpen(false)
    navigate(
      `/app/documents/${hit.document_id}/overview?page=${encodeURIComponent(hit.page_id)}&line=${hit.line_index}`,
    )
  }

  const showPanel = open && query.trim().length > 0

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <label className="sr-only" htmlFor={listId}>
        {t('search.label')}
      </label>
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#8b93a7]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16.5 16.5 L20 20" strokeLinecap="round" />
        </svg>
        <input
          id={listId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
          placeholder={t('search.placeholder')}
          autoComplete="off"
          className="h-8 w-full rounded-full border border-[#e6e8f2] bg-[#f8f9fc] py-1 pr-3 pl-8 font-sans text-[0.82rem] text-[#172033] outline-none placeholder:text-[#98a2b3] focus:border-[#4f46e5] focus:bg-white focus:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]"
        />
        {loading && (
          <span
            className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-[#4338a8]/30 border-t-[#4338a8]"
            aria-hidden="true"
          />
        )}
      </div>

      {showPanel && (
        <div
          className="absolute top-[calc(100%+0.4rem)] right-0 left-0 z-30 max-h-[min(22rem,60vh)] overflow-auto rounded-xl border border-[#e6e8f2] bg-white shadow-[0_16px_40px_rgba(23,28,51,0.14)]"
          role="listbox"
          aria-label={t('search.results')}
        >
          {error ? (
            <p className="m-0 px-3 py-3 font-sans text-[0.85rem] text-[#dc2626]" role="alert">
              {t('errors.searchFailed')}
            </p>
          ) : loading && hits.length === 0 ? (
            <p className="m-0 px-3 py-3 font-sans text-[0.85rem] text-[#5d657c]">
              {t('common.loading')}
            </p>
          ) : hits.length === 0 ? (
            <p className="m-0 px-3 py-3 font-sans text-[0.85rem] text-[#5d657c]">
              {t('search.empty')}
            </p>
          ) : (
            <ul className="m-0 list-none p-1.5">
              {hits.map((hit) => (
                <li key={`${hit.document_id}-${hit.page_id}-${hit.line_index}`}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left hover:bg-[#f5f6fa]"
                    onClick={() => openHit(hit)}
                  >
                    <span className="truncate font-sans text-[0.78rem] font-semibold text-[#4338a8]">
                      {hit.document_name}
                      <span className="font-normal text-[#8b93a7]">
                        {' '}
                        · {t('search.page', { n: hit.page_number })}
                      </span>
                    </span>
                    <span className="line-clamp-2 font-sans text-[0.88rem] leading-6 text-[#27272a]">
                      <span className="mr-1.5 text-[0.72rem] text-[#a1a1aa] tabular-nums">
                        {hit.line_index}
                      </span>
                      <HighlightedText text={hit.line_text} query={query} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
