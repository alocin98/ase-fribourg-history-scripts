// Page /app : visible seulement avec une session. La déconnexion ramène à l'accueil.
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../auth/AuthProvider'
import Brand from '../components/Brand'
import LanguageSwitcher from '../components/LanguageSwitcher'

const pageWidth = 'mx-auto w-[min(1120px,calc(100%-3rem))] max-[860px]:w-[min(100%-2rem,680px)]'

type AccountLocationState = { logoutFailed?: boolean }

export default function AccountPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [isLeaving, setIsLeaving] = useState(false)
  const logoutFailed = Boolean((location.state as AccountLocationState | null)?.logoutFailed)

  // On quitte la page avant de fermer la session pour éviter un retour vers /login.
  const handleLogout = async () => {
    setIsLeaving(true)
    navigate('/', { replace: true })
    try {
      await logout()
    } catch {
      setIsLeaving(false)
      navigate('/app', { replace: true, state: { logoutFailed: true } satisfies AccountLocationState })
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-[#111827]">
      <header className="sticky top-0 z-20 border-b border-[#e1e8e5] bg-white/95 backdrop-blur-[14px]">
        <div className={`flex min-h-[68px] items-center justify-between gap-3 py-3 ${pageWidth}`}>
          <Brand />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <button
              type="button"
              className="inline-flex h-10 cursor-pointer items-center rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleLogout}
              disabled={isLeaving}
            >
              {t('nav.signOut')}
            </button>
          </div>
        </div>
      </header>

      <main className={`${pageWidth} py-12`}>
        <article className="max-w-[40rem] rounded-2xl border border-[#e3e0ef] bg-white p-8 shadow-[0_8px_20px_rgba(49,46,129,0.035)] sm:p-10">
          <p className="m-0 mb-4 font-sans text-[0.72rem] font-extrabold tracking-[0.15em] text-[#6d28d9] uppercase">{t('account.kicker')}</p>
          <h1 className="m-0 font-sans text-[clamp(1.7rem,2.5vw,2.15rem)] leading-[1.15] font-bold tracking-[-0.035em] text-[#171c33]">
            {t('account.hello', { name: user?.name ?? '' })}
          </h1>
          {user?.email && <p className="mt-3 mb-0 font-sans text-[0.95rem] text-[#667085]">{user.email}</p>}
          <p className="mt-6 mb-0 font-sans text-[1.05rem] leading-[1.75] text-[#5d657c]">{t('account.text')}</p>
          {logoutFailed && <p className="mt-4 mb-0 text-[0.9rem] text-[#dc2626]" role="alert">{t('errors.server')}</p>}
        </article>
      </main>
    </div>
  )
}
