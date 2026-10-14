// Page / : présentation du projet
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import manuscriptPage from '../assets/gillion-de-trazegnies-1464.jpg'
import { useAuth } from '../auth/AuthProvider'
import Brand from '../components/Brand'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function WelcomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const isSignedIn = Boolean(user)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  // Le bouton principal ouvre le compte si la session existe, sinon la connexion.
  const openAccount = () => {
    navigate(isSignedIn ? '/app' : '/login')
  }

  const signOut = async () => {
    setIsLeaving(true)
    setIsMenuOpen(false)
    try {
      await logout()
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#f5f6fa] font-sans text-[#172033]">
      {/* Barre du haut : logo, langue, connexion ou profil. */}
      <header className="w-full">
        <div className="relative flex w-full items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <Brand />

          <button
            type="button"
            className="ml-auto hidden size-[42px] shrink-0 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-[10px] border border-[#d9dded] bg-white max-[1100px]:inline-flex"
            aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={isMenuOpen}
            aria-controls="welcome-menu"
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            <span className="block h-0.5 w-[18px] rounded-sm bg-[#1e1b4b]" />
            <span className="block h-0.5 w-[18px] rounded-sm bg-[#1e1b4b]" />
            <span className="block h-0.5 w-[18px] rounded-sm bg-[#1e1b4b]" />
          </button>

          <nav
            id="welcome-menu"
            className={`${isMenuOpen ? 'max-[1100px]:flex' : 'max-[1100px]:hidden'} flex items-center gap-5 font-sans min-[1101px]:shrink-0 max-[1100px]:absolute max-[1100px]:top-[calc(100%+0.4rem)] max-[1100px]:right-0 max-[1100px]:left-0 max-[1100px]:z-40 max-[1100px]:flex-col max-[1100px]:items-stretch max-[1100px]:gap-1 max-[1100px]:rounded-[14px] max-[1100px]:border max-[1100px]:border-[#e3e0ef] max-[1100px]:bg-white max-[1100px]:p-3 max-[1100px]:shadow-[0_16px_36px_rgba(30,27,75,0.12)]`}
            aria-label={t('nav.main')}
          >
            <div className="flex items-center gap-1.5 max-[1100px]:w-full max-[1100px]:flex-col max-[1100px]:items-stretch">
              {isSignedIn && (
                <Link
                  to="/app"
                  className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border border-[#d9ddf5] bg-white px-2.5 font-sans text-[0.72rem] font-bold text-[#4338a8] no-underline hover:bg-[#4f46e5] hover:text-white max-[1100px]:h-auto max-[1100px]:w-full max-[1100px]:py-[0.7rem]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('home.dashboard')} <span aria-hidden="true">↗</span>
                </Link>
              )}
              <LanguageSwitcher
                compact
                className="max-[1100px]:mx-3 max-[1100px]:my-[0.35rem] max-[1100px]:h-auto max-[1100px]:self-start"
              />
              {!isSignedIn && (
                <Link
                  to="/login"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] no-underline hover:bg-[#4f46e5] hover:text-white max-[1100px]:h-auto max-[1100px]:w-full max-[1100px]:py-[0.7rem]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.signIn')} <span aria-hidden="true">↗</span>
                </Link>
              )}
              {isSignedIn && (
                <button
                  type="button"
                  className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#d9ddf5] bg-white px-2.5 font-sans text-[0.72rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 max-[1100px]:h-auto max-[1100px]:w-full max-[1100px]:py-[0.7rem]"
                  onClick={() => {
                    void signOut()
                  }}
                  disabled={isLeaving}
                >
                  {t('nav.signOut')}
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main
        className="flex min-h-0 w-full flex-1 justify-center px-5 pt-2 sm:px-8 lg:px-10"
        id="accueil"
      >
        <div className="grid h-max w-full max-w-[1120px] content-start grid-cols-[minmax(0,1.05fr)_minmax(16rem,0.8fr)] items-stretch gap-12 max-[860px]:grid-cols-1 max-[860px]:content-center max-[860px]:gap-6">
          {/* Titre et manuscrit de l'exemple. */}
          <div className="flex min-w-0 flex-col justify-center">
            <h1 className="m-0 font-sans text-[clamp(1.85rem,2.3vw,2.05rem)] leading-[1.08] font-bold tracking-[-0.045em] text-[#171c33] max-[860px]:text-[clamp(1.7rem,6vw,2.2rem)] max-[480px]:text-[1.35rem] max-[480px]:leading-[1.2]">
              {t('home.titleLine1')}
              <br />
              {t('home.titleLine2')}
            </h1>
            <p className="mt-[1.4rem] mb-0 max-w-[34rem] font-sans text-[1.05rem] leading-[1.7] text-[#5d657c]">
              {t('home.intro')}
            </p>
            <div className="mt-[1.8rem] flex flex-wrap items-center gap-[1.15rem]">
              <button
                type="button"
                className="inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-full border border-[#d9ddf5] bg-white px-[1.1rem] py-3 font-sans text-[0.95rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white"
                onClick={openAccount}
              >
                {t('home.discover')} <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <figure
            className="relative m-0 w-fit max-w-full justify-self-center overflow-hidden rounded-[18px] border border-[#d4d0ea] bg-[#e8e6f2] shadow-[0_20px_46px_rgba(49,46,129,0.14)] after:pointer-events-none after:absolute after:inset-0 after:z-[2] after:bg-[linear-gradient(135deg,rgba(37,99,235,0.14),transparent_46%,rgba(124,58,237,0.18))] after:content-['']"
            aria-label={t('home.manuscriptAlt')}
          >
            <img
              className="block h-auto max-h-[min(30rem,calc(100dvh-8.5rem))] w-auto max-w-[min(100%,18.5rem)] max-[860px]:max-h-[min(15rem,36dvh)]"
              src={manuscriptPage}
              alt={t('home.manuscriptAlt')}
            />
            {/* Positions en % de l'image : 6e ligne du texte et canon dans la bordure du bas. */}
            <span
              className="absolute top-[56.2%] left-[8.5%] z-[3] h-[3%] w-[70%] rounded border-[1.5px] border-[#2563eb] bg-[rgba(37,99,235,0.08)] before:absolute before:top-[-4px] before:right-[-4px] before:size-[7px] before:rounded-full before:bg-[#7c3aed] before:shadow-[0_0_0_4px_rgba(124,58,237,0.18)] before:content-['']"
              aria-hidden="true"
            />
            <span
              className="absolute top-[80.5%] left-[46%] z-[3] h-[13.5%] w-[14%] rounded border-[1.5px] border-[#7c3aed] bg-[rgba(37,99,235,0.08)] before:absolute before:bottom-[-4px] before:left-[-4px] before:size-[7px] before:rounded-full before:bg-[#7c3aed] before:shadow-[0_0_0_4px_rgba(124,58,237,0.18)] before:content-['']"
              aria-hidden="true"
            />
            <span className="absolute top-[51.6%] left-[8.5%] z-[4] rounded-[0.3rem] border border-white/55 bg-[rgba(49,46,129,0.82)] px-[0.45rem] py-[0.3rem] font-sans text-[0.6rem] font-bold tracking-[0.11em] text-white uppercase">
              {t('home.line')}
            </span>
            <span className="absolute top-[85%] left-[62%] z-[4] rounded-[0.3rem] border border-white/55 bg-[rgba(49,46,129,0.82)] px-[0.45rem] py-[0.3rem] font-sans text-[0.6rem] font-bold tracking-[0.11em] text-white uppercase">
              {t('home.cannon')}
            </span>
          </figure>
        </div>
      </main>
    </div>
  )
}
