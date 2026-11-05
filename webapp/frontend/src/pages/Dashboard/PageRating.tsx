import { useTranslation } from 'react-i18next'

import type { TranscriptionLine } from '../../api/transcription'
import ConfidenceInfo from './ConfidenceInfo'
import {
  CONFIDENCE_BANDS,
  confidencePercent,
  levelColors,
  pageRating,
  type ConfidenceLevel,
} from './transcriptionLines'

type Props = {
  lines: TranscriptionLine[]
}

const bands: { level: ConfidenceLevel; key: 'linesHigh' | 'linesMedium' | 'linesLow' }[] = [
  { level: 'high', key: 'linesHigh' },
  { level: 'medium', key: 'linesMedium' },
  { level: 'low', key: 'linesLow' },
]

// Erreur estimée de la page, au-dessus de l'image, et nombre de lignes par bande.
// Le détail par ligne est dans la marge de l'image.
export default function PageRating({ lines }: Props) {
  const { t } = useTranslation()
  const rating = pageRating(lines)
  if (!rating) return null
  const colors = levelColors[rating.level]

  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-xl bg-[#fafafa] px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: colors.stroke }}
          aria-hidden="true"
        />
        <p className="m-0 font-sans text-[0.92rem] font-bold text-[#171c33] tabular-nums">
          {t('documents.pageConfidence', { value: confidencePercent(rating.average) })}
        </p>
        <ConfidenceInfo />
      </div>
      <p className="m-0 flex flex-wrap gap-x-3 gap-y-1 font-sans text-[0.74rem] text-[#71717a] tabular-nums">
        {bands.map(({ level, key }) => (
          <span key={level} className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: levelColors[level].stroke }}
              aria-hidden="true"
            />
            {t(`documents.${key}`, { count: rating.counts[level], ...CONFIDENCE_BANDS })}
          </span>
        ))}
      </p>
    </div>
  )
}
