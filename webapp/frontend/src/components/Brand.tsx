import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// Nom de l'application en lettres classiques. « light » pour un fond sombre (accueil).
export default function Brand({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { t } = useTranslation()
  const light = tone === 'light'

  return (
    <Link
      to="/"
      className={`inline-flex min-w-0 shrink items-baseline font-serif text-[1.35rem] tracking-[0.01em] whitespace-nowrap no-underline ${light ? 'text-[#f4ead8]' : 'text-[#2a1d10]'}`}
      aria-label={t('brand.name')}
    >
      Manuscript&nbsp;<em className={light ? 'text-[#e3c48f]' : 'text-[#8a5a2b]'}>AI</em>
    </Link>
  )
}
