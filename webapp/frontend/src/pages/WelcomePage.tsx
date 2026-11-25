// Page / : accueil avec un vieux livre qui tourne ses pages en fond.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../auth/AuthProvider'
import Brand from '../components/Brand'
import DustLayer from '../components/DustLayer'
import LanguageSwitcher from '../components/LanguageSwitcher'

const STEPS = ['step1', 'step2', 'step3'] as const
const NUMERALS = ['I', 'II', 'III']

export default function WelcomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const isSignedIn = Boolean(user)
  const [isLeaving, setIsLeaving] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isExiting, setIsExiting] = useState(false)
  const nextPath = isSignedIn ? '/app' : '/login'

  // Passe à la page suivante (connexion ou documents) avec un court fondu vers le haut.
  const goNext = useCallback(() => {
    if (isExiting) return
    setIsExiting(true)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => navigate(nextPath), reduce ? 0 : 550)
  }, [isExiting, navigate, nextPath])

  // Molette, glissé vers le haut sur mobile, ou flèche bas / Page suivante : on avance.
  useEffect(() => {
    let wheelTotal = 0
    let wheelReset = 0
    let touchStartY: number | null = null

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY <= 0) return
      wheelTotal += e.deltaY
      window.clearTimeout(wheelReset)
      wheelReset = window.setTimeout(() => (wheelTotal = 0), 250)
      if (wheelTotal > 60) goNext()
    }
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? null
    }
    const onTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0]?.clientY
      if (touchStartY !== null && endY !== undefined && touchStartY - endY > 60) goNext()
      touchStartY = null
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') goNext()
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(wheelReset)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [goNext])

  // Pas de vidéo qui bouge si l'utilisateur a demandé moins d'animations.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) videoRef.current?.pause()
  }, [])

  const signOut = async () => {
    setIsLeaving(true)
    try {
      await logout()
    } finally {
      setIsLeaving(false)
    }
  }

  const ghostButton =
    'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e9d5b0]/30 bg-[#1a120b]/40 px-4 text-[0.8rem] font-semibold text-[#f4ead8] no-underline backdrop-blur-sm transition-colors hover:border-[#e9d5b0]/70 hover:bg-[#e9d5b0]/10 disabled:opacity-60'

  return (
    <div className="relative isolate flex h-dvh w-full flex-col overflow-hidden bg-[#140f0a] font-sans text-[#f4ead8]">
      {/* Fond : le livre, assombri à gauche pour que le texte reste lisible. */}
      <div
        className={`pointer-events-none absolute inset-0 z-0 transition-[transform,opacity] duration-700 ease-in ${isExiting ? 'scale-[1.06] opacity-0' : ''}`}
        aria-hidden="true"
      >
        <video
          ref={videoRef}
          className="absolute inset-y-0 right-0 h-full w-full object-cover min-[861px]:w-[78%] min-[861px]:[mask-image:linear-gradient(90deg,transparent,black_30%)]"
          src="/landing/book.mp4"
          poster="/landing/book-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-label={t('landing.videoAlt')}
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,15,10,0.94)_0%,rgba(20,15,10,0.78)_38%,rgba(20,15,10,0.25)_70%,rgba(20,15,10,0.1)_100%)] max-[860px]:bg-[linear-gradient(180deg,rgba(20,15,10,0.55)_0%,rgba(20,15,10,0.88)_55%,rgba(20,15,10,0.96)_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(10,7,4,0.7)_100%)]"
          aria-hidden="true"
        />
        <div className="absolute inset-0">
          <DustLayer />
        </div>
      </div>

      <header className="relative z-10 flex w-full flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-12">
        <Brand tone="light" />
        <nav className="flex items-center gap-2" aria-label={t('nav.main')}>
          <LanguageSwitcher compact tone="light" />
          {isSignedIn ? (
            <button
              type="button"
              className={ghostButton}
              onClick={() => void signOut()}
              disabled={isLeaving}
            >
              {t('nav.signOut')}
            </button>
          ) : (
            <Link to="/login" className={ghostButton}>
              {t('nav.signIn')}
            </Link>
          )}
        </nav>
      </header>

      <main
        className={`relative z-10 flex transition-[transform,opacity] duration-500 ease-in ${isExiting ? '-translate-y-10 opacity-0' : ''} min-h-0 w-full flex-1 items-center px-5 sm:px-8 lg:px-12 max-[860px]:items-end max-[860px]:pb-6`}
      >
        <div className="w-full max-w-[36rem]">
          <p className="m-0 flex items-center gap-3 text-[0.72rem] font-semibold tracking-[0.22em] text-[#d9b98a] uppercase">
            <span className="h-px w-8 bg-[#d9b98a]/70" aria-hidden="true" />
            {t('landing.eyebrow')}
          </p>

          <h1 className="mt-5 mb-0 font-serif text-[clamp(2.3rem,4.6vw,4.2rem)] leading-[1.05] font-normal tracking-[-0.01em] text-[#f7efe0]">
            {t('landing.title1')}
            <br />
            <em className="text-[#e3c48f]">{t('landing.title2')}</em>
          </h1>

          <p className="mt-6 mb-0 max-w-[31rem] text-[1.02rem] leading-[1.7] text-[#e8dcc6]/80">
            {t('landing.intro')}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full border-0 bg-[#e9d5b0] px-6 text-[0.95rem] font-bold text-[#2a1d10] shadow-[0_10px_30px_rgba(233,213,176,0.18)] transition hover:bg-[#f4e4c4] hover:shadow-[0_12px_36px_rgba(233,213,176,0.3)]"
              onClick={goNext}
            >
              {t('landing.start')} <span aria-hidden="true">→</span>
            </button>
            {!isSignedIn && (
              <Link
                to="/register"
                className="inline-flex min-h-[48px] items-center rounded-full border border-[#e9d5b0]/35 px-6 text-[0.95rem] font-semibold text-[#f4ead8] no-underline transition-colors hover:border-[#e9d5b0]/80 hover:bg-[#e9d5b0]/10"
              >
                {t('landing.create')}
              </Link>
            )}
          </div>

          <ol className="mt-12 mb-0 grid list-none grid-cols-3 gap-4 border-t border-[#e9d5b0]/15 p-0 pt-6 max-[520px]:grid-cols-1 max-[520px]:gap-2 max-[520px]:pt-4">
            {STEPS.map((step, i) => (
              <li
                key={step}
                className="flex items-baseline gap-2.5 text-[0.85rem] leading-snug text-[#e8dcc6]/85"
              >
                <span className="font-serif text-[1.05rem] text-[#d9b98a] italic">
                  {NUMERALS[i]}
                </span>
                {t(`landing.${step}`)}
              </li>
            ))}
          </ol>
        </div>
      </main>

      <footer
        className={`relative z-10 grid grid-cols-[1fr_auto_1fr] items-end px-5 pb-4 transition-opacity duration-300 sm:px-8 lg:px-12 ${isExiting ? 'opacity-0' : ''}`}
      >
        <span />
        <button
          type="button"
          onClick={goNext}
          className="group flex cursor-pointer flex-col items-center gap-1.5 border-0 bg-transparent p-2 text-[0.66rem] font-semibold tracking-[0.2em] text-[#d9c7a6]/70 uppercase transition-colors hover:text-[#f4ead8]"
        >
          {t('landing.scroll')}
          <span
            className="block size-3 rotate-45 border-r border-b border-current motion-safe:animate-bounce"
            aria-hidden="true"
          />
        </button>
        <span className="text-right text-[0.68rem] tracking-[0.18em] text-[#d9c7a6]/45 uppercase max-[860px]:hidden">
          {t('landing.credit')}
        </span>
      </footer>
    </div>
  )
}
