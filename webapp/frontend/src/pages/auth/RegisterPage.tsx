// Page /register : crée le compte, puis ouvre la session et va sur /app.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ErrorKey } from '../../i18n'

import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthProvider'
import Brand from '../../components/Brand'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useAuthTransition } from './useAuthTransition'

const inputClass = 'w-full rounded-lg border border-[#d4d8e6] bg-white px-3.5 py-2 font-sans text-base text-[#172033] outline-none placeholder:text-[0.8rem] placeholder:text-[#98a2b3] focus:border-[#4f46e5] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]'
const labelClass = 'flex flex-col gap-1.5 font-sans text-[0.85rem] font-semibold text-[#1c2440]'
const navLinkClass = 'inline-flex h-8 items-center rounded-full border border-[#d9ddf5] bg-white px-2.5 font-sans text-[0.72rem] font-bold text-[#4338a8] no-underline hover:bg-[#4f46e5] hover:text-white'
const navigationClass = 'flex w-full items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-10 max-[640px]:flex-wrap'
const submitClass = 'w-fit shrink-0 cursor-pointer rounded-full border border-[#514fec] bg-white px-5 py-2.5 font-sans text-[0.95rem] font-bold text-[#514fec] hover:bg-[#514fec] hover:text-white disabled:cursor-not-allowed disabled:opacity-60'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { register } = useAuth()
  const enterAnimation = useAuthTransition()
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState<ErrorKey | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (fieldName: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [fieldName]: value }))
  }

  // Refuse un formulaire incomplet ou deux mots de passe différents, puis crée le compte.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = formData.name.trim()
    const email = formData.email.trim()
    const password = formData.password
    const confirmPassword = formData.confirmPassword
    if (!name || !email || !password || !confirmPassword) {
      setError('errors.requiredFields')
      return
    }
    if (password !== confirmPassword) {
      setError('errors.passwordMismatch')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await register(name, email, password)
      navigate('/app/documents')
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      if (status === 409) setError('errors.emailTaken')
      else if (status === 422) setError('errors.invalidEmail')
      else setError('errors.server')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#f5f6fa] font-sans text-[#172033]">
      <nav className={navigationClass} aria-label={t('nav.auth')}>
        <Brand />
        <div className="flex flex-wrap items-center gap-1.5">
          <LanguageSwitcher compact />
          <Link to="/" className={navLinkClass}>{t('nav.home')}</Link>
          <Link to="/login" className={navLinkClass}>{t('nav.signIn')}</Link>
        </div>
      </nav>

      {/* Nom et email sur la première ligne, les deux mots de passe sur la seconde. */}
      <main className={`mx-auto flex min-h-0 w-full max-w-[760px] flex-1 items-center px-5 py-4 sm:px-8 ${enterAnimation}`}>
        <div className="w-full overflow-hidden rounded-2xl border border-[#d5d9e8] bg-white bg-[radial-gradient(16px_16px_at_0_0,rgba(81,79,236,0.7),transparent_72%),radial-gradient(16px_16px_at_100%_100%,rgba(81,79,236,0.7),transparent_72%)] px-7 py-7 shadow-[0_10px_28px_rgba(49,46,129,0.06)] max-[640px]:px-5 max-[480px]:px-4">
          <h1 className="m-0 font-sans text-[1.6rem] leading-[1.2] font-bold tracking-[-0.03em] text-[#171c33]">{t('register.title')}</h1>
          <p className="mt-2 mb-5 font-sans text-base leading-[1.6] text-[#5d657c]">{t('register.hint')}</p>

          <form className="grid grid-cols-2 gap-4 rounded-xl border border-[#e3e0ef] bg-[#f8f9fc] p-5 max-[640px]:grid-cols-1" onSubmit={handleSubmit}>
            <label className={labelClass}>
              {t('register.name')}
              <input className={inputClass} type="text" autoComplete="name" value={formData.name} onChange={(event) => updateField('name', event.target.value)} placeholder={t('register.namePlaceholder')} />
            </label>
            <label className={labelClass}>
              {t('register.email')}
              <input className={inputClass} type="email" autoComplete="email" value={formData.email} onChange={(event) => updateField('email', event.target.value)} placeholder={t('register.emailPlaceholder')} />
            </label>
            <label className={labelClass}>
              {t('register.password')}
              <input className={inputClass} type="password" autoComplete="new-password" value={formData.password} onChange={(event) => updateField('password', event.target.value)} placeholder={t('register.passwordPlaceholder')} />
            </label>
            <label className={labelClass}>
              {t('register.confirmPassword')}
              <input className={inputClass} type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} placeholder={t('register.confirmPlaceholder')} />
            </label>
            {error && <p className="col-span-full m-0 text-[0.9rem] text-[#dc2626]">{t(error)}</p>}
            <div className="col-span-full mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <button type="submit" className={submitClass} disabled={isSubmitting}>
                {isSubmitting ? t('register.submitting') : t('register.submit')}
              </button>
              <p className="m-0 ml-auto text-right font-sans text-[0.9rem] text-[#5d657c]">
                {t('register.hasAccount')}{' '}
                <Link className="font-bold text-[#4f46e5] underline decoration-[#4f46e5] underline-offset-[3px]" to="/login">{t('register.login')}</Link>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
