import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Brand() {
  const { t } = useTranslation()

  return (
    <Link
      to="/"
      className="inline-flex min-w-0 shrink items-center gap-3 text-[#172033] no-underline"
      aria-label={t('brand.name')}
    >
      <span className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] font-extrabold text-white">
        A
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[0.95rem] sm:text-[1.05rem]">
          {t('brand.name')}
        </strong>
        <small className="mt-[0.2rem] block truncate text-[0.7rem] text-[#667085] max-[520px]:hidden">
          {t('brand.tagline')}
        </small>
      </span>
    </Link>
  )
}
