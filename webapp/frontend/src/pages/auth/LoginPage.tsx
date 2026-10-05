// Page /login : email et mot de passe, puis redirection vers le compte.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ErrorKey } from '../../i18n'

import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthProvider'
import Brand from '../../components/Brand'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useAuthTransition } from './useAuthTransition'

const inputClass = 'w-full rounded-lg border border-[#d4d8e6] bg-white px-3.5 py-2.5 font-sans text-base text-[#172033] outline-none placeholder:text-[0.8rem] placeholder:text-[#98a2b3] focus:border-[#4f46e5] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]'
const labelClass = 'flex flex-col gap-1.5 font-sans text-[0.85rem] font-semibold text-[#1c2440]'
const navigationClass = 'flex w-full items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-10 max-[640px]:flex-wrap'
const homeLinkClass = 'inline-flex h-8 items-center rounded-full border border-[#d9ddf5] bg-white px-2.5 font-sans text-[0.72rem] font-bold text-[#4338a8] no-underline hover:bg-[#4f46e5] hover:text-white'
const submitClass = 'w-fit shrink-0 cursor-pointer rounded-full border border-[#514fec] bg-white px-5 py-2.5 font-sans text-[0.95rem] font-bold text-[#514fec] hover:bg-[#514fec] hover:text-white disabled:cursor-not-allowed disabled:opacity-60'

export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login } = useAuth()
  const enterAnimation = useAuthTransition()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ErrorKey | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Vérifie les champs, ouvre la session, puis affiche la page du compte.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const emailValue = email.trim()
    if (!emailValue || !password) {
      setError('errors.requiredFields')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await login(emailValue, password)
      navigate('/app/documents')
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      if (status === 403 && err instanceof ApiError && err.message === 'Account disabled') setError('errors.accountDisabled')
      else if (status === 401) setError('errors.invalidCredentials')
      else if (status === 422) setError('errors.invalidEmail')
      else setError('errors.server')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-[#f5f6fa] font-sans text-[#172033]">
      <nav className={navigationClass} aria-label={t('nav.auth')}>
        <Brand />
        <div className="flex items-center gap-1.5 max-[640px]:w-full max-[640px]:justify-between">
          <LanguageSwitcher compact />
          <Link to="/" className={homeLinkClass}>{t('nav.home')}</Link>
        </div>
      </nav>

      <main className={`mx-auto mt-10 w-[min(580px,calc(100%-3rem))] pb-10 max-[760px]:mt-8 max-[760px]:w-[min(680px,calc(100%-2rem))] ${enterAnimation}`}>
        <div className="overflow-hidden rounded-2xl border border-[#d5d9e8] bg-white bg-[radial-gradient(16px_16px_at_0_0,rgba(81,79,236,0.7),transparent_72%),radial-gradient(16px_16px_at_100%_100%,rgba(81,79,236,0.7),transparent_72%)] px-7 py-6 shadow-[0_10px_28px_rgba(49,46,129,0.06)] max-[480px]:px-4">
          <h1 className="m-0 font-sans text-[1.6rem] leading-[1.2] font-bold tracking-[-0.03em] text-[#171c33]">{t('login.title')}</h1>
          <p className="mt-1.5 mb-4 font-sans text-base leading-[1.55] text-[#5d657c]">{t('login.hint')}</p>

          <form className="flex flex-col gap-3 rounded-xl border border-[#e3e0ef] bg-[#f8f9fc] p-4" onSubmit={handleSubmit}>
            <label className={labelClass}>
              {t('login.email')}
              <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('login.emailPlaceholder')} />
            </label>
            <label className={labelClass}>
              {t('login.password')}
              <input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('login.passwordPlaceholder')} />
            </label>
            {error && <p className="m-0 text-[0.9rem] text-[#dc2626]">{t(error)}</p>}
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <button type="submit" className={submitClass} disabled={isSubmitting}>
                {isSubmitting ? t('login.submitting') : t('login.submit')}
              </button>
              <p className="m-0 ml-auto font-sans text-[0.9rem] text-[#5d657c]">
                {t('login.noAccount')}{' '}
                <Link className="font-bold text-[#4f46e5] underline decoration-[#4f46e5] underline-offset-[3px]" to="/register">{t('login.createAccount')}</Link>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
