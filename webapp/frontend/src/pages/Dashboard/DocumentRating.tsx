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
    <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#fffdf8] py-1 pr-1 pl-3 font-sans text-[0.78rem] text-[#6b5a45] shadow-[inset_0_0_0_1px_#e8dcc8]">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: levelColors[rating.level].stroke }}
        aria-hidden="true"
      />
      <span className="font-semibold text-[#2a1d10] tabular-nums">
        {t('documents.documentConfidence', { value: confidencePercent(rating.average) })}
      </span>
      <span className="tabular-nums">{t('documents.pagesRated', { rated, total })}</span>
      <ConfidenceInfo />
    </div>
  )
}
