import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import logo from '../assets/Logo Manuscript AI.png'

export default function Brand({ onDark = false }: { onDark?: boolean }) {
  const { t } = useTranslation()

  return (
    <Link to="/" className="inline-flex min-w-0 shrink items-center no-underline" aria-label={t('brand.name')}>
      <img
        src={logo}
        alt=""
        className={`h-9 w-auto max-w-[min(42vw,11rem)] object-contain sm:h-11 ${onDark ? 'brightness-0 invert' : ''}`}
      />
    </Link>
  )
}
