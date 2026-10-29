import { useTranslation } from 'react-i18next'

import type { TranscriptionLine } from '../../api/transcription'
import LineCrop from './LineCrop'
import { confidenceLevel, confidencePercent, levelColors } from './transcriptionLines'

type Props = {
  src: string
  size: [number, number] | null
  line: TranscriptionLine | null
}

const STRIP_HEIGHT_REM = 3.5

// Bande fixe au-dessus du texte : l'extrait de l'image d'où vient la ligne active.
export default function LineSource({ src, size, line }: Props) {
  const { t } = useTranslation()

  if (!line || !line.bbox || !size) {
    return (
      <div className="grid h-[5.5rem] shrink-0 place-items-center rounded-xl border border-dashed border-[#e4e4e7] px-3 text-center font-sans text-[0.8rem] text-[#a1a1aa]">
        {t('documents.lineSourceHint')}
      </div>
    )
  }

  const level = confidenceLevel(line.confidence)

  return (
    <div className="flex h-[5.5rem] shrink-0 flex-col justify-center gap-1.5 rounded-xl bg-[#fafafa] px-3 py-2">
      <LineCrop
        src={src}
        size={size}
        bbox={line.bbox}
        maxHeightRem={STRIP_HEIGHT_REM}
        label={t('documents.lineSource', { n: line.index })}
      />
      <p className="m-0 flex items-center gap-2 font-sans text-[0.72rem] text-[#71717a]">
        <span>{t('documents.lineSource', { n: line.index })}</span>
        {line.confidence !== null && (
          <span className={`rounded-full px-1.5 font-semibold ${levelColors[level].chip}`}>
            {t('documents.confidence', { value: confidencePercent(line.confidence) })}
          </span>
        )}
      </p>
    </div>
  )
}
