// Page / : hero 
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import manuscript from '../assets/manuscript-3d.png'
import { useAuth } from '../auth/AuthProvider'
import Brand from '../components/Brand'
import { LANGUAGES } from '../i18n'

export default function WelcomePage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const isSignedIn = Boolean(user)
  const current = i18n.resolvedLanguage
  const [menuOpen, setMenuOpen] = useState(false)

  const openAccount = () => {
    navigate(isSignedIn ? '/app' : '/login')
  }

  const languageButtons = (compact: boolean) => (
    <div
      className={`flex items-center gap-1 rounded-full bg-white/10 ${compact ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[0.65rem] sm:px-2 sm:text-xs'}`}
      role="group"
      aria-label={t('nav.language')}
    >
      {LANGUAGES.map((lng) => {
        const active = current === lng
        return (
          <button
            key={lng}
            type="button"
            lang={lng}
            aria-pressed={active}
            onClick={() => {
              void i18n.changeLanguage(lng)
              setMenuOpen(false)
            }}
            className={`cursor-pointer ${active ? 'rounded-full bg-indigo-600 px-1.5 py-0.5 font-bold' : 'px-1 opacity-60'}`}
          >
            {lng.toUpperCase()}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#071422] font-sans text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_48%_at_50%_100%,#f7efe4_0%,#f0e2cc_34%,rgba(247,239,228,0)_72%)] md:bg-[radial-gradient(ellipse_75%_85%_at_92%_72%,#f7efe4_0%,#f0e2cc_30%,rgba(247,239,228,0)_68%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#071525_0%,#071525_38%,rgba(7,21,37,0.82)_52%,rgba(7,21,37,0)_74%)] md:bg-[linear-gradient(90deg,#071525_0%,#071525_46%,rgba(7,21,37,0.72)_58%,rgba(7,21,37,0)_74%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_18%,rgba(24,62,112,0.85)_0%,rgba(7,21,37,0)_70%)] md:bg-[radial-gradient(ellipse_55%_45%_at_18%_28%,rgba(24,62,112,0.85)_0%,rgba(7,21,37,0)_70%)]" />
        <div className="absolute inset-x-0 top-0 h-[62%] overflow-hidden md:inset-y-0 md:left-0 md:h-full md:w-[56%]">
          <div className="absolute top-[-12%] h-[124%] w-[42%] bg-[linear-gradient(90deg,transparent,rgba(255,248,236,0.16),transparent)] blur-3xl animate-hero-gleam" />
        </div>
      </div>
      <header className="relative z-30 mx-auto flex w-full max-w-7xl shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Brand onDark />

        <button
          type="button"
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full md:hidden"
          aria-expanded={menuOpen}
          aria-controls="welcome-menu"
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="relative block h-3.5 w-5" aria-hidden="true">
            <span className={`absolute left-0 h-0.5 w-5 rounded-full bg-white transition ${menuOpen ? 'top-1.5 rotate-45' : 'top-0'}`} />
            <span className={`absolute top-1.5 left-0 h-0.5 w-5 rounded-full bg-white transition ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`absolute left-0 h-0.5 w-5 rounded-full bg-white transition ${menuOpen ? 'top-1.5 -rotate-45' : 'top-3'}`} />
          </span>
        </button>

        <nav className="hidden shrink-0 items-center gap-2 text-xs font-medium sm:gap-5 sm:text-sm md:flex" aria-label={t('nav.main')}>
          {isSignedIn && (
            <button type="button" className="cursor-pointer opacity-90 hover:opacity-100" onClick={() => navigate('/app')}>
              {t('home.dashboard')}
            </button>
          )}
          {languageButtons(false)}
          <button
            type="button"
            className="cursor-pointer opacity-90 hover:opacity-100"
            onClick={() => { if (isSignedIn) void logout(); else navigate('/login') }}
          >
            {isSignedIn ? t('nav.signOut') : t('nav.signIn')}
          </button>
        </nav>

        {menuOpen && (
          <div id="welcome-menu" className="absolute top-[calc(100%-0.25rem)] right-4 left-4 rounded-2xl border border-white/15 bg-[#10233d]/95 p-4 shadow-2xl backdrop-blur-md md:hidden">
            <div className="flex flex-col items-start gap-4 text-sm font-medium">
              {languageButtons(true)}
              {isSignedIn && (
                <button type="button" className="cursor-pointer opacity-90 hover:opacity-100" onClick={() => navigate('/app')}>
                  {t('home.dashboard')}
                </button>
              )}
              <button
                type="button"
                className="cursor-pointer opacity-90 hover:opacity-100"
                onClick={() => { setMenuOpen(false); if (isSignedIn) void logout(); else navigate('/login') }}
              >
                {isSignedIn ? t('nav.signOut') : t('nav.signIn')}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 min-h-0 w-full flex-1">
        <div className="relative flex h-full min-h-0 flex-col md:block">
          <div className="flex w-full max-w-[42rem] shrink-0 flex-col items-start gap-3 px-5 pt-3 sm:gap-4 sm:px-8 sm:pt-6 md:absolute md:top-[16%] md:left-[6%] md:w-[min(40rem,48%)] md:px-0 md:pt-0 lg:top-[24%] lg:left-[6.5%] lg:w-[min(42rem,50%)] lg:gap-5">
            <p className="m-0 flex items-center gap-2 text-[0.58rem] font-medium tracking-[0.12em] uppercase [animation-delay:120ms] animate-hero-rise md:gap-3.5 md:text-sm md:tracking-[0.22em]">
              <span className="h-px w-6 origin-left bg-gradient-to-r from-[#f8edd4] to-[#e4c27a]/30 [animation-delay:80ms] animate-hero-line md:w-14" aria-hidden="true" />
              <span className="bg-gradient-to-r from-[#fff8ee] to-[#e8c98a] bg-clip-text text-transparent">{t('brand.tagline')}</span>
            </p>
            <h1 className="max-w-[16em] text-[1.4rem] leading-[1.12] font-extrabold tracking-tight text-white [animation-delay:280ms] animate-hero-rise md:max-w-[18em] md:text-[clamp(1.85rem,3.8vw,3.28rem)] md:leading-[1.08]">
              {t('home.titleLine1')}
              <br />
              {t('home.titleLine2')}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed font-light text-slate-100/90 [animation-delay:520ms] animate-hero-rise md:text-lg">{t('home.intro')}</p>
            <button
              type="button"
              className="group mt-1 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md transition-all [animation-delay:720ms] animate-hero-rise hover:bg-white/15 md:px-6 md:py-3 md:text-base"
              onClick={openAccount}
            >
              {t('home.discover')}
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
            </button>
          </div>

          <div className="pointer-events-none relative min-h-0 flex-1 md:absolute md:inset-0">
            <div className="absolute inset-x-3 bottom-2 top-6 flex items-end justify-center sm:top-8 md:inset-auto md:bottom-[8%] md:left-auto md:right-[4%] md:top-auto md:block lg:bottom-[10%] lg:right-[3.5%]">
              <div className="relative flex h-full max-w-full items-end justify-center animate-hero-book md:block md:h-auto">
                <div
                  className="absolute -bottom-2 left-1/2 z-0 h-8 w-[68%] -translate-x-1/2 rounded-[50%] bg-[#020814]/75 blur-2xl sm:h-10 md:-bottom-4 md:h-14 lg:-bottom-6 lg:h-16 lg:w-[78%]"
                  aria-hidden="true"
                />
                <img
                  src={manuscript}
                  alt={t('home.manuscriptAlt')}
                  className="relative z-10 h-auto w-auto max-h-full max-w-[min(100%,29.25rem)] object-contain md:max-h-[min(50dvh,25.25rem)] md:max-w-[min(42vw,29.25rem)] lg:max-h-[min(58dvh,25.25rem)] lg:max-w-[min(40vw,29.25rem)]"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
