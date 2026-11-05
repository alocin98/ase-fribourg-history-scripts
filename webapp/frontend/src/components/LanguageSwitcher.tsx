import { useTranslation } from 'react-i18next'

import { LANGUAGES } from '../i18n'

export default function LanguageSwitcher({
  className = '',
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage

  return (
    <div
      className={`flex shrink-0 items-center self-center rounded-full border border-[#d9dded] bg-white ${compact ? 'h-8 gap-0.5 p-0.5' : 'h-10 gap-[0.2rem] p-[0.2rem]'} ${className}`}
      role="group"
      aria-label={t('nav.language')}
    >
      {LANGUAGES.map((lng) => {
        const active = current === lng
        return (
          <button
            key={lng}
            type="button"
            lang={lng}
            aria-pressed={active}
            onClick={() => i18n.changeLanguage(lng)}
            className={`cursor-pointer rounded-full border-0 font-sans font-bold ${compact ? 'min-w-6 px-1.5 py-0.5 text-[0.6rem]' : 'min-w-8 px-[0.45rem] py-[0.35rem] text-[0.65rem]'} ${active ? 'bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white' : 'bg-transparent text-[#75809a] hover:text-[#4f46e5]'}`}
          >
            {lng.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
