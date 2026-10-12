import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ErrorKey } from '../../i18n'

import { deleteAccount, updateCurrentUser } from '../../api/auth'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthProvider'
import ConfirmDialog from '../../components/ConfirmDialog'
import DocumentsFrame from './DocumentsFrame'

const fieldClass = 'mt-1 w-full rounded-lg border border-[#d4d8e6] bg-[#fafafe] px-3 py-2 font-sans text-[0.95rem] font-normal text-[#172033] outline-none placeholder:text-[#98a2b3] focus:border-[#4f46e5] focus:bg-white focus:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]'
const labelClass = 'block font-sans text-[0.82rem] font-semibold text-[#1c2440]'
const neutralButton = 'inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white disabled:cursor-not-allowed disabled:opacity-60'

export default function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, applyUser, forgetUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<ErrorKey | ''>('')
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setEmail(user.email)
  }, [user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = name.trim()
    const nextEmail = email.trim()
    if (!nextName || !nextEmail) {
      setSaved(false)
      setError('errors.requiredFields')
      return
    }
    if (password || confirmPassword) {
      if (!password || !confirmPassword) {
        setSaved(false)
        setError('errors.requiredFields')
        return
      }
      if (password !== confirmPassword) {
        setSaved(false)
        setError('errors.passwordMismatch')
        return
      }
    }

    setError('')
    setSaved(false)
    setIsSaving(true)
    try {
      const updated = await updateCurrentUser({
        name: nextName,
        email: nextEmail,
        ...(password ? { password } : {}),
      })
      applyUser(updated)
      setPassword('')
      setConfirmPassword('')
      setSaved(true)
      setIsEditing(false)
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      if (status === 409) setError('errors.emailTaken')
      else if (status === 422) setError('errors.invalidEmail')
      else setError('errors.server')
    } finally {
      setIsSaving(false)
    }
  }

  const removeAccount = async () => {
    setIsClosing(true)
    try {
      await deleteAccount()
      forgetUser()
      navigate('/')
    } catch {
      setError('errors.server')
      setConfirmDelete(false)
    } finally {
      setIsClosing(false)
    }
  }

  return (
    <DocumentsFrame>
      <main className="h-full overflow-auto px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="m-0 font-sans text-[clamp(1.45rem,3vw,1.85rem)] leading-tight font-bold tracking-[-0.03em] text-[#171c33]">{t('profile.title')}</h1>
          <button type="button" className={neutralButton} onClick={() => { setIsEditing((open) => !open); setError(''); setSaved(false) }}>
            {isEditing ? t('documents.cancel') : t('profile.edit')}
          </button>
        </div>

        <div className="mt-5 grid min-h-[17rem] grid-cols-1 items-stretch gap-4 min-[860px]:grid-cols-2">
          <section className="rounded-2xl border border-[#e6e8f2] bg-white p-4 sm:p-5">
            {isEditing ? (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className={labelClass}>
                    {t('register.name')}
                    <input className={fieldClass} value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} />
                  </label>
                  <label className={labelClass}>
                    {t('register.email')}
                    <input className={fieldClass} type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
                  </label>
                  <label className={labelClass}>
                    {t('register.password')}
                    <input className={fieldClass} type="password" value={password} autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} />
                  </label>
                  <label className={labelClass}>
                    {t('register.confirmPassword')}
                    <input className={fieldClass} type="password" value={confirmPassword} autoComplete="new-password" onChange={(event) => setConfirmPassword(event.target.value)} />
                  </label>
                </div>
                <p className="mt-2 mb-0 font-sans text-[0.78rem] leading-5 text-[#8b93a7]">{t('profile.passwordHint')}</p>
                {error && <p className="mt-2 mb-0 text-[0.85rem] text-[#dc2626]" role="alert">{t(error)}</p>}
                <button type="submit" className="mt-3 inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-4 font-sans text-[0.85rem] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSaving}>
                  {t('documents.save')}
                </button>
              </form>
            ) : (
              <dl className="m-0">
                <dt className="font-sans text-[0.75rem] font-bold tracking-[0.06em] text-[#8b93a7] uppercase">{t('register.name')}</dt>
                <dd className="mt-1 mb-4 font-sans text-[1.05rem] font-semibold break-words text-[#171c33]">{user?.name}</dd>
                <dt className="font-sans text-[0.75rem] font-bold tracking-[0.06em] text-[#8b93a7] uppercase">{t('register.email')}</dt>
                <dd className="mt-1 mb-0 font-sans text-[1.05rem] break-all text-[#3d4663]">{user?.email}</dd>
                {saved && <p className="mt-4 mb-0 text-[0.9rem] text-[#312e81]" role="status">{t('profile.saved')}</p>}
              </dl>
            )}
          </section>

          <section className="flex flex-col rounded-2xl border border-[#e6e8f2] bg-white p-4 sm:p-5">
            <p className="m-0 font-sans text-[0.92rem] leading-6 text-[#5d657c]">{t('profile.deleteHint')}</p>
            <div className="mt-3">
              <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left font-sans text-[0.92rem] font-semibold text-[#dc2626] underline decoration-[#f3d0d0] underline-offset-4" onClick={() => { setError(''); setConfirmDelete(true) }}>
                {t('profile.deleteAccount')}
              </button>
              {!isEditing && error && <p className="mt-3 mb-0 text-[0.85rem] text-[#dc2626]" role="alert">{t(error)}</p>}
            </div>
          </section>
        </div>
      </main>

      {confirmDelete && (
        <ConfirmDialog
          title={t('profile.confirmDelete')}
          message={t('profile.deleteHint')}
          confirmLabel={t('profile.confirm')}
          busy={isClosing}
          onConfirm={() => { void removeAccount() }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </DocumentsFrame>
  )
}
