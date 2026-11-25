import { useTranslation } from 'react-i18next'

import { LANGUAGES } from '../i18n'

export default function LanguageSwitcher({
  className = '',
  compact = false,
  tone = 'dark',
}: {
  className?: string
  compact?: boolean
  tone?: 'dark' | 'light'
}) {
  const light = tone === 'light'
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage

  return (
    <div
      className={`flex shrink-0 items-center self-center rounded-full border ${light ? 'border-[#e9d5b0]/30 bg-[#1a120b]/40 backdrop-blur-sm' : 'border-[#dfd1b9] bg-[#fffdf8]'} ${compact ? 'h-8 gap-0.5 p-0.5' : 'h-10 gap-[0.2rem] p-[0.2rem]'} ${className}`}
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
            className={`cursor-pointer rounded-full border-0 font-sans font-bold ${compact ? 'min-w-6 px-1.5 py-0.5 text-[0.6rem]' : 'min-w-8 px-[0.45rem] py-[0.35rem] text-[0.65rem]'} ${active ? (light ? 'bg-[#e9d5b0] text-[#2a1d10]' : 'bg-[#2a1d10] text-[#f4ead8]') : light ? 'bg-transparent text-[#d9c7a6]/70 hover:text-[#f4ead8]' : 'bg-transparent text-[#8c7a62] hover:text-[#8a5a2b]'}`}
          >
            {lng.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
