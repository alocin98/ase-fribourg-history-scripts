import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ConfirmDialog from '../../components/ConfirmDialog'

const iconButton =
  'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e6e8f2] bg-white text-[#4338a8] no-underline hover:border-[#c9cdf8]'
const dangerButton =
  'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#f3d0d0] bg-white text-[#dc2626] hover:border-[#dc2626]'

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
export default function DocumentActions({ id, onRemove }: { id: string; onRemove: () => void }) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex flex-nowrap items-center gap-1.5">
      <Link
        className={iconButton}
        to={`/app/documents/${id}/overview`}
        aria-label={t('documents.view')}
        title={t('documents.view')}
      >
        <Eye />
      </Link>
      <button
        type="button"
        className={dangerButton}
        aria-label={t('documents.remove')}
        title={t('documents.remove')}
        onClick={() => setConfirming(true)}
      >
        <Trash />
      </button>
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
