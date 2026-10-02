import { useTranslation } from 'react-i18next'

import { LANGUAGES } from '../i18n'

// Bascule entre les langues disponibles de l'interface.
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <div
      className="flex gap-0.5 rounded-full border border-[#d9dded] bg-white p-0.5"
      role="group"
      aria-label={t('header.language')}
    >
      {LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          lang={lng}
          aria-pressed={i18n.resolvedLanguage === lng}
          onClick={() => i18n.changeLanguage(lng)}
          className="min-w-8 rounded-full px-2 py-1.5 text-[0.65rem] font-bold text-[#75809a] transition hover:-translate-y-px hover:text-ase-indigo aria-pressed:bg-ase-gradient aria-pressed:text-white"
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
