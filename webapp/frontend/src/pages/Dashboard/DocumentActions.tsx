import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ConfirmDialog from '../../components/ConfirmDialog'

const iconButton =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-[#e6e8f2] bg-white text-[#4338a8] no-underline hover:border-[#c9cdf8]'
const dangerButton =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-[#f3d0d0] bg-white text-[#dc2626] hover:border-[#dc2626]'
const tooltipClass =
  'pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 -translate-x-1/2 rounded-md bg-[#171c33] px-2 py-1 font-sans text-[0.7rem] font-semibold whitespace-nowrap text-white opacity-0 shadow-[0_4px_12px_rgba(23,28,51,0.2)] transition-opacity duration-75 group-hover:opacity-100 group-focus-within:opacity-100'

function Eye() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function Trash() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l1 12h6l1-12" />
    </svg>
  )
}

// La modification n'est pas proposée : l'API n'a pas encore de route pour modifier un document.
export default function DocumentActions({
  id,
  onRemove,
  showView = true,
  showRemove = true,
}: {
  id: string
  onRemove: () => void
  showView?: boolean
  showRemove?: boolean
}) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex flex-nowrap items-center gap-1.5">
      {showView && (
        <div className="group relative shrink-0">
          <Link
            className={iconButton}
            to={`/app/documents/${id}/overview`}
            aria-label={t('documents.view')}
          >
            <Eye />
          </Link>
          <span role="tooltip" className={tooltipClass}>
            {t('documents.view')}
          </span>
        </div>
      )}
      {showRemove && (
        <div className="group relative shrink-0">
          <button
            type="button"
            className={dangerButton}
            aria-label={t('documents.remove')}
            onClick={() => setConfirming(true)}
          >
            <Trash />
          </button>
          <span role="tooltip" className={tooltipClass}>
            {t('documents.remove')}
          </span>
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title={t('documents.confirmDelete')}
          message={t('documents.confirmDeleteHint')}
          confirmLabel={t('documents.remove')}
          onConfirm={() => {
            setConfirming(false)
            onRemove()
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
