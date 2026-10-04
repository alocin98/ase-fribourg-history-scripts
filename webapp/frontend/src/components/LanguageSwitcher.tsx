import { useTranslation } from 'react-i18next'

import { LANGUAGES } from '../i18n'

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage

  return (
    <div
      className={`flex h-10 shrink-0 items-center gap-[0.2rem] self-center rounded-full border border-[#d9dded] bg-white p-[0.2rem] ${className}`}
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
            className={`min-w-8 cursor-pointer rounded-full border-0 px-[0.45rem] py-[0.35rem] font-sans text-[0.65rem] font-bold ${active ? 'bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white' : 'bg-transparent text-[#75809a] hover:text-[#4f46e5]'}`}
          >
            {lng.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
