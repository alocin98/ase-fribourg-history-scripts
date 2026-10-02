import { useTranslation } from 'react-i18next'

import { LANGUAGES } from '../i18n'

// Bascule entre les langues disponibles de l'interface.
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <div className="flex gap-1 text-sm" role="group" aria-label={t('nav.language')}>
      {LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          lang={lng}
          aria-pressed={i18n.resolvedLanguage === lng}
          onClick={() => i18n.changeLanguage(lng)}
          className="rounded px-1.5 py-0.5 text-muted hover:text-ink aria-pressed:bg-accent-soft aria-pressed:font-medium aria-pressed:text-accent"
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
