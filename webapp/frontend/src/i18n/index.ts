// Configuration de l'internationalisation (anglais par défaut, français disponible).
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import fr from './locales/fr.json'

export const LANGUAGES = ['en', 'fr'] as const
export type Language = (typeof LANGUAGES)[number]

const LANGUAGE_KEY = 'ase_lang'

// Langue choisie précédemment par l'utilisateur, sinon l'anglais.
function getSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    return LANGUAGES.includes(saved as Language) ? (saved as Language) : 'en'
  } catch {
    return 'en'
  }
}

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const

// Mémorise la langue et la reporte sur <html lang> pour l'accessibilité.
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  try {
    localStorage.setItem(LANGUAGE_KEY, lng)
  } catch {
    // Stockage indisponible : la langue reste valable pour la session.
  }
})

i18n.use(initReactI18next).init({
  resources,
  lng: getSavedLanguage(),
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  interpolation: { escapeValue: false },
})

export default i18n

// Clé d'un message d'erreur de formulaire, traduite au moment de l'affichage.
export type ErrorKey = `errors.${keyof typeof en.errors}`
