import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { CONFIDENCE_BANDS, levelColors, type ConfidenceLevel } from './transcriptionLines'

const bands: { level: ConfidenceLevel; key: 'bandHigh' | 'bandMedium' | 'bandLow' }[] = [
  { level: 'high', key: 'bandHigh' },
  { level: 'medium', key: 'bandMedium' },
  { level: 'low', key: 'bandLow' },
]

// Bouton ⓘ : explique comment la confiance est calculée et où passent les couleurs.
export default function ConfidenceInfo() {
  const { t } = useTranslation()
  const id = useId()

  return (
    <>
      <button
        type="button"
        className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full border border-[#d4d4d8] bg-white font-serif text-[0.7rem] font-bold text-[#71717a] italic hover:border-[#4f46e5] hover:text-[#4f46e5]"
        popoverTarget={id}
        aria-label={t('documents.confidenceInfo.open')}
        title={t('documents.confidenceInfo.open')}
      >
        i
      </button>
      <div
        id={id}
        popover="auto"
        className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-2xl border-0 bg-white p-5 font-sans text-[0.88rem] leading-6 text-[#3f3f46] shadow-[0_24px_50px_rgba(23,28,51,0.18)] backdrop:bg-[rgba(23,28,51,0.25)]"
      >
        <h2 className="m-0 text-[1rem] font-bold text-[#171c33]">
          {t('documents.confidenceInfo.title')}
        </h2>
        <p className="mt-2 mb-0">{t('documents.confidenceInfo.tokens')}</p>
        <p className="my-3 rounded-lg bg-[#f4f4f5] px-3 py-2 text-center font-mono text-[0.82rem] text-[#171c33]">
          confidence = 1/n · Σ pᵢ
        </p>
        <p className="m-0">{t('documents.confidenceInfo.definition')}</p>
        <p className="mt-2 mb-0">{t('documents.confidenceInfo.average')}</p>
        <ul className="mt-3 mb-0 grid list-none gap-1 p-0">
          {bands.map(({ level, key }) => (
            <li key={level} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: levelColors[level].stroke }}
                aria-hidden="true"
              />
              {t(`documents.confidenceInfo.${key}`, CONFIDENCE_BANDS)}
            </li>
          ))}
        </ul>
        <p className="mt-3 mb-0 text-[0.8rem] leading-5 text-[#71717a]">
          {t('documents.confidenceInfo.caveat')}
        </p>
      </div>
    </>
  )
}
