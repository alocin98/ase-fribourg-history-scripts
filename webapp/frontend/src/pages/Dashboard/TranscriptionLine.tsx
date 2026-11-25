import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { EntityLabel, TranscriptionLine as Line } from '../../api/transcription'
import { confidenceLevel, confidencePercent, levelColors } from './transcriptionLines'
import type { LineEntity } from './entities'

type Props = {
  line: Line
  active: boolean
  // Vrai quand la ligne est activée depuis l'image : on la ramène dans la zone visible.
  reveal: boolean
  onHover: (index: number | null) => void
  onOpen: (index: number) => void
  onEntityInspect?: (entity: LineEntity) => void
  entities?: LineEntity[]
}

const entityColors = {
  person: 'bg-[#dbeafe] decoration-[#2563eb]',
  date: 'bg-[#fef3c7] decoration-[#d97706]',
  location: 'bg-[#dcfce7] decoration-[#16a34a]',
}

function highlightedText(
  text: string,
  entities: LineEntity[],
  label: (kind: EntityLabel) => string,
  inspect?: (entity: LineEntity) => void,
) {
  const parts = []
  let cursor = 0
  for (const entity of entities) {
    if (entity.start < cursor || entity.end <= entity.start || entity.end > text.length) continue
    if (entity.start > cursor) parts.push(text.slice(cursor, entity.start))
    parts.push(
      <mark
        key={`${entity.start}-${entity.end}-${entity.label}`}
        className={`rounded-sm px-0.5 text-inherit underline decoration-2 underline-offset-2 ${entity.label === 'date' ? '' : 'cursor-help'} ${entityColors[entity.label]}`}
        title={label(entity.label)}
        onMouseEnter={() => {
          if (entity.label !== 'date') inspect?.(entity)
        }}
        onClick={(event) => {
          if (entity.label === 'date') return
          event.stopPropagation()
          inspect?.(entity)
        }}
      >
        {text.slice(entity.start, entity.end)}
      </mark>,
    )
    cursor = entity.end
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

// Une ligne de transcription, reliée à son cadre sur l'image au survol ; un clic l'ouvre.
export default function TranscriptionLine({
  line,
  active,
  reveal,
  onHover,
  onOpen,
  onEntityInspect,
  entities = [],
}: Props) {
  const { t } = useTranslation()
  const ref = useRef<HTMLButtonElement>(null)
  const level = confidenceLevel(line.confidence)

  useEffect(() => {
    if (active && reveal) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active, reveal])

  return (
    <li>
      <button
        ref={ref}
        type="button"
        className={`group grid w-full cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_auto] items-baseline gap-2 rounded-lg px-2 py-1 text-left font-sans text-[0.98rem] leading-7 text-[#27272a] ${active ? 'bg-[#eef2ff]' : 'hover:bg-[#fafafa]'}`}
        aria-haspopup="dialog"
        onMouseEnter={() => onHover(line.index)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(line.index)}
        onBlur={() => onHover(null)}
        onClick={() => onOpen(line.index)}
      >
        <span className="text-right font-sans text-[0.72rem] text-[#a1a1aa] tabular-nums">
          {line.index}
        </span>
        <span className="break-words whitespace-pre-wrap">
          {line.text ? (
            highlightedText(
              line.text,
              entities,
              (kind) => t(`documents.entities.${kind}`),
              onEntityInspect,
            )
          ) : (
            <span className="text-[#a1a1aa]">—</span>
          )}
        </span>
        {line.confidence !== null && (
          <span
            className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold tabular-nums ${levelColors[level].chip} ${active || level === 'low' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
            title={t('documents.confidenceHint')}
          >
            {t('documents.confidence', { value: confidencePercent(line.confidence) })}
          </span>
        )}
      </button>
    </li>
  )
}
