import { useTranslation } from 'react-i18next'

import type { EntityLabel } from '../../api/transcription'

// Mêmes teintes que le surlignage des entités dans les lignes.
const legendColors: Record<EntityLabel, string> = {
  person: 'bg-[#60a5fa]',
  date: 'bg-[#fbbf24]',
  location: 'bg-[#4ade80]',
}

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
}

// Interrupteur qui affiche les personnes, dates et lieux dans la transcription, avec la légende.
export default function EntitiesToggle({ checked, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-[#71717a]">
      {checked &&
        (Object.keys(legendColors) as EntityLabel[]).map((label) => (
          <span key={label}>
            <i
              className={`mr-1 inline-block size-2 rounded-full ${legendColors[label]}`}
              aria-hidden="true"
            />
            {t(`documents.entities.${label}`)}
          </span>
        ))}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className="inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-sans text-[0.75rem] font-semibold text-[#3f3f46]"
        onClick={() => onChange(!checked)}
      >
        <span
          className={`relative inline-block h-4 w-7 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#514fec]' : 'bg-[#d4d4d8]'}`}
          aria-hidden="true"
        >
          <span
            className={`absolute top-0.5 left-0.5 size-3 rounded-full bg-white shadow-[0_1px_2px_rgba(23,28,51,0.2)] transition-transform ${checked ? 'translate-x-3' : ''}`}
          />
        </span>
        {t('documents.entities.show')}
      </button>
    </div>
  )
}
