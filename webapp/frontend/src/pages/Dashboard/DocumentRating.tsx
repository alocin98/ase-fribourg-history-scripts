import { useTranslation } from 'react-i18next'

import ConfidenceInfo from './ConfidenceInfo'
import { confidencePercent, levelColors, type Rating } from './transcriptionLines'

type Props = {
  rating: Rating
  rated: number
  total: number
}

// Résumé du document entier, à côté du titre.
export default function DocumentRating({ rating, rated, total }: Props) {
  const { t } = useTranslation()

  return (
    <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white py-1 pr-1 pl-3 font-sans text-[0.78rem] text-[#5d657c] shadow-[inset_0_0_0_1px_#e4e4e7]">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: levelColors[rating.level].stroke }}
        aria-hidden="true"
      />
      <span className="font-semibold text-[#171c33] tabular-nums">
        {t('documents.documentConfidence', { value: confidencePercent(rating.average) })}
      </span>
      <span className="tabular-nums">{t('documents.pagesRated', { rated, total })}</span>
      <ConfidenceInfo />
    </div>
  )
}
