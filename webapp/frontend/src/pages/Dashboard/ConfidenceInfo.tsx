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
        className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dccdb3] bg-[#fffdf8] font-serif text-[0.7rem] font-bold text-[#6b5a45] italic hover:border-[#8a5a2b] hover:text-[#8a5a2b]"
        popoverTarget={id}
        aria-label={t('documents.confidenceInfo.open')}
        title={t('documents.confidenceInfo.open')}
      >
        i
      </button>
      <div
        id={id}
        popover="auto"
        className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-2xl border-0 bg-[#fffdf8] p-5 font-sans text-[0.88rem] leading-6 text-[#4a3b2a] shadow-[0_24px_50px_rgba(42,29,16,0.18)] backdrop:bg-[rgba(42,29,16,0.25)]"
      >
        <h2 className="m-0 text-[1rem] font-bold text-[#2a1d10]">
          {t('documents.confidenceInfo.title')}
        </h2>
        <p className="mt-2 mb-0">{t('documents.confidenceInfo.tokens')}</p>
        <p className="my-3 rounded-lg bg-[#f1e9da] px-3 py-2 text-center font-mono text-[0.82rem] text-[#2a1d10]">
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
        <p className="mt-3 mb-0 text-[0.8rem] leading-5 text-[#6b5a45]">
          {t('documents.confidenceInfo.caveat')}
        </p>
      </div>
    </>
  )
}
