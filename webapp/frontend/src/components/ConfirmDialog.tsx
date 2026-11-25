import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

// Fenêtre modale native qui demande de confirmer une action destructive.
// Le parent la monte à l'ouverture et la démonte dans `onClose`. Pendant `busy`, elle reste ouverte.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string
  message?: string
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[#e8dcc8] bg-[#fffdf8] p-6 text-left whitespace-normal text-[#2a1d10] shadow-[0_24px_60px_rgba(42,29,16,0.18)] backdrop:bg-[#2a1d10]/40 sm:p-7"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault()
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <h2
        id={titleId}
        className="m-0 font-serif text-[1.25rem] leading-tight font-semibold text-[#2a1d10]"
      >
        {title}
      </h2>
      {message && (
        <p className="mt-2 mb-0 font-sans text-[0.95rem] leading-6 text-[#6b5a45]">{message}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#dfcfb2] bg-[#fffdf8] px-5 font-sans text-[0.95rem] font-bold text-[#7a4d22] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={() => dialogRef.current?.close()}
          autoFocus
        >
          {t('documents.cancel')}
        </button>
        <button
          type="button"
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[#dc2626] px-5 font-sans text-[0.95rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
