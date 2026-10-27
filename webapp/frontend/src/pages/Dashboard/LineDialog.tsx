import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TranscriptionLine } from '../../api/transcription'
import ConfidenceInfo from './ConfidenceInfo'
import LineCrop from './LineCrop'
import { confidenceLevel, confidencePercent, levelColors } from './transcriptionLines'

type Props = {
  src: string
  size: [number, number] | null
  lines: TranscriptionLine[]
  index: number
  onNavigate: (index: number) => void
  onClose: () => void
}

const navButtonClass =
  'grid size-9 cursor-pointer place-items-center rounded-full border border-[#e4e4e7] bg-white text-[#3f3f46] hover:border-[#4f46e5] hover:text-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#e4e4e7] disabled:hover:text-[#3f3f46]'

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      className={`size-4 ${direction === 'right' ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      aria-hidden="true"
    >
      <path d="M12.5 5 L7.5 10 L12.5 15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Fenêtre centrée sur une seule ligne : l'extrait de l'image, sa transcription,
// puis la confiance de chaque mot. Les flèches passent à la ligne voisine.
export default function LineDialog({ src, size, lines, index, onNavigate, onClose }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  // La ligne ouverte et ses voisines (undefined au début ou à la fin).
  let position = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].index === index) position = i
  }
  const line = lines[position]
  const previous = lines[position - 1]
  const next = lines[position + 1]

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    // showModal donne le focus au premier bouton (ⓘ) : on le place sur « Fermer ».
    closeRef.current?.focus()
  }, [])

  if (!line) return null
  const level = confidenceLevel(line.confidence)

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-4xl rounded-2xl border border-[#e6e8f2] bg-white p-0 text-left text-[#172033] shadow-[0_24px_60px_rgba(23,28,51,0.18)] backdrop:bg-[#171c33]/40"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && previous) onNavigate(previous.index)
        if (event.key === 'ArrowRight' && next) onNavigate(next.index)
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#f4f4f5] px-5 py-3.5 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2
            id={titleId}
            className="m-0 font-sans text-[1.1rem] font-bold tracking-[-0.01em] text-[#171c33]"
          >
            {t('documents.lineDialog.title', { n: line.index, total: lines.length })}
          </h2>
          {line.confidence !== null && (
            <span
              className={`rounded-full px-2.5 py-0.5 font-sans text-[0.75rem] font-semibold tabular-nums ${levelColors[level].chip}`}
              title={t('documents.confidenceHint')}
            >
              {t('documents.confidence', { value: confidencePercent(line.confidence) })}
            </span>
          )}
          <ConfidenceInfo />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className={navButtonClass}
            disabled={!previous}
            aria-label={t('documents.lineDialog.previous')}
            title={t('documents.lineDialog.previous')}
            onClick={() => previous && onNavigate(previous.index)}
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            className={navButtonClass}
            disabled={!next}
            aria-label={t('documents.lineDialog.next')}
            title={t('documents.lineDialog.next')}
            onClick={() => next && onNavigate(next.index)}
          >
            <Chevron direction="right" />
          </button>
          <button
            type="button"
            ref={closeRef}
            className={`${navButtonClass} ml-1.5`}
            aria-label={t('documents.lineDialog.close')}
            title={t('documents.lineDialog.close')}
            onClick={() => dialogRef.current?.close()}
          >
            <svg
              className="size-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              aria-hidden="true"
            >
              <path d="M5.5 5.5 L14.5 14.5 M14.5 5.5 L5.5 14.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <LineDetail key={line.index} src={src} size={size} line={line} />
    </dialog>
  )
}

// Contenu propre à une ligne ; remonté à chaque changement de ligne pour oublier le survol.
function LineDetail({
  src,
  size,
  line,
}: {
  src: string
  size: [number, number] | null
  line: TranscriptionLine
}) {
  const { t } = useTranslation()
  const [hoveredWord, setHoveredWord] = useState<number | null>(null)

  return (
    <div className="flex max-h-[calc(100dvh-8rem)] flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6">
      {line.bbox && size && (
        <div className="flex justify-center rounded-xl bg-[#fafafa] px-4 py-6">
          <LineCrop
            src={src}
            size={size}
            bbox={line.bbox}
            maxHeightRem={7}
            label={t('documents.lineSource', { n: line.index })}
          />
        </div>
      )}

      <p className="m-0 text-center font-sans text-[1.3rem] leading-10 text-[#171c33]">
        {line.words.length > 0
          ? line.words.map((word, i) => (
              <span key={i}>
                {i > 0 && ' '}
                <span
                  className={`rounded px-0.5 underline decoration-[3px] underline-offset-[6px] transition-colors duration-100 ${hoveredWord === i ? 'bg-[#eef2ff]' : ''}`}
                  style={{
                    textDecorationColor: levelColors[confidenceLevel(word.confidence)].stroke,
                  }}
                  onMouseEnter={() => setHoveredWord(i)}
                  onMouseLeave={() => setHoveredWord(null)}
                >
                  {word.text}
                </span>
              </span>
            ))
          : line.text}
      </p>

      <section>
        <h3 className="m-0 font-sans text-[0.72rem] font-semibold tracking-[0.08em] text-[#71717a] uppercase">
          {t('documents.lineDialog.words')}
        </h3>
        {line.words.length === 0 ? (
          <p className="mt-2 mb-0 font-sans text-[0.85rem] text-[#a1a1aa]">
            {t('documents.lineDialog.noWords')}
          </p>
        ) : (
          <>
            <p className="mt-1 mb-0 font-sans text-[0.78rem] text-[#71717a]">
              {t('documents.lineDialog.wordsHint')}
            </p>
            <ol className="mt-3 mb-0 flex list-none flex-wrap gap-2 p-0">
              {line.words.map((word, i) => {
                const wordLevel = confidenceLevel(word.confidence)
                const percent = confidencePercent(word.confidence)
                return (
                  <li
                    key={i}
                    className={`flex min-w-[5.5rem] flex-col gap-1.5 rounded-lg px-2.5 py-2 font-sans transition-colors duration-100 ${hoveredWord === i ? 'bg-[#eef2ff] shadow-[inset_0_0_0_1px_#c7d2fe]' : 'bg-[#fafafa]'}`}
                    onMouseEnter={() => setHoveredWord(i)}
                    onMouseLeave={() => setHoveredWord(null)}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.92rem] font-semibold text-[#171c33]">
                        {word.text}
                      </span>
                      <span
                        className={`text-[0.72rem] font-semibold tabular-nums ${levelColors[wordLevel].chip} rounded-full px-1.5`}
                      >
                        {percent} %
                      </span>
                    </span>
                    <span className="h-1 overflow-hidden rounded-full bg-[#e4e4e7]">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: levelColors[wordLevel].stroke,
                        }}
                      />
                    </span>
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </section>
    </div>
  )
}
