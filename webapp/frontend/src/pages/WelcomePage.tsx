// Page / : présentation du projet
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import manuscriptPage from '../assets/gillion-de-trazegnies-1464.jpg'
import { useAuth } from '../auth/AuthProvider'
import Brand from '../components/Brand'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function WelcomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, logout: closeSession } = useAuth()
  const isSignedIn = Boolean(user)
  const nameParts = (user?.name ?? '').trim().split(/\s+/).filter(Boolean)
  const firstName = nameParts[0] || t('home.guestName')
  const lastName = nameParts.slice(1).join(' ')
  const email = user?.email?.trim() || ''
  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || email.charAt(0)}`.toUpperCase()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  // Affiche le bouton « haut de page » après un défilement
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.scrollBehavior
    root.style.scrollBehavior = 'smooth'
    const onScroll = () => setShowBackToTop(window.scrollY > 420)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      root.style.scrollBehavior = previous
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Ferme la session. Si le serveur refuse, le profil reste ouvert.
  const signOut = async () => {
    setIsProfileOpen(false)
    try {
      await closeSession()
    } catch {
      setIsProfileOpen(true)
    }
  }

  // Le bouton principal ouvre le compte si la session existe, sinon la connexion.
  const openAccount = () => {
    navigate(isSignedIn ? '/app' : '/login')
  }

  const menuLinkClass = 'inline-flex h-10 items-center font-sans text-[0.82rem] font-bold whitespace-nowrap text-[#5d657c] no-underline hover:text-[#6d28d9] max-[1100px]:h-auto max-[1100px]:rounded-lg max-[1100px]:px-3 max-[1100px]:py-[0.7rem]'
  const pageWidth = 'mx-auto w-[min(1120px,calc(100%-3rem))] max-[860px]:w-[min(680px,calc(100%-2rem))]'
  const sectionTitleClass = 'm-0 font-sans text-[clamp(1.7rem,2.5vw,2.15rem)] leading-[1.15] font-bold tracking-[-0.035em] text-[#171c33] max-[860px]:text-[clamp(1.7rem,6vw,2.2rem)] max-[860px]:whitespace-normal max-[480px]:text-[1.2rem] xl:whitespace-nowrap'
  const featureCardClass = 'rounded-xl border border-[#e3e0ef] bg-white p-7 shadow-[0_8px_20px_rgba(49,46,129,0.035)]'
  const cardTitleClass = 'm-0 font-sans text-[1.05rem] font-bold whitespace-nowrap text-[#1e1b4b] max-[860px]:whitespace-normal'
  const cardTextClass = 'mt-3 mb-0 font-sans text-[0.95rem] leading-[1.7] text-[#5d657c]'
  const stepNumberClass = 'relative z-[1] mb-5 flex size-12 items-center justify-center rounded-full border border-[#c4b5fd] bg-[#f8f7f4] font-sans text-[0.85rem] font-extrabold text-[#2563eb]'

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6fa] font-sans text-[#172033]">
      {/* Barre du haut : logo, menu, langue, connexion ou profil. */}
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

        <nav id="welcome-menu" className={`${isMenuOpen ? 'max-[1100px]:flex' : 'max-[1100px]:hidden'} flex items-center gap-5 font-sans min-[1101px]:shrink-0 max-[1100px]:absolute max-[1100px]:top-[calc(100%+0.4rem)] max-[1100px]:right-0 max-[1100px]:left-0 max-[1100px]:z-40 max-[1100px]:flex-col max-[1100px]:items-stretch max-[1100px]:gap-1 max-[1100px]:rounded-[14px] max-[1100px]:border max-[1100px]:border-[#e3e0ef] max-[1100px]:bg-white max-[1100px]:p-3 max-[1100px]:shadow-[0_16px_36px_rgba(30,27,75,0.12)]`} aria-label={t('nav.main')}>
          <a className={menuLinkClass} href="#fonctionnalites" onClick={() => setIsMenuOpen(false)}>{t('home.features')}</a>
          <a className={menuLinkClass} href="#comment-ca-marche" onClick={() => setIsMenuOpen(false)}>{t('home.steps')}</a>
          <a className={menuLinkClass} href="#apropos" onClick={() => setIsMenuOpen(false)}>{t('home.about')}</a>
          <div className="flex items-center gap-1.5 max-[1100px]:w-full max-[1100px]:flex-col max-[1100px]:items-stretch">
          {isSignedIn && (
            <Link to="/app" className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border border-[#d9ddf5] bg-white px-2.5 font-sans text-[0.72rem] font-bold text-[#4338a8] no-underline hover:bg-[#4f46e5] hover:text-white max-[1100px]:h-auto max-[1100px]:w-full max-[1100px]:py-[0.7rem]" onClick={() => setIsMenuOpen(false)}>
              {t('home.dashboard')} <span aria-hidden="true">↗</span>
            </Link>
          )}
          <LanguageSwitcher compact className="max-[1100px]:mx-3 max-[1100px]:my-[0.35rem] max-[1100px]:h-auto max-[1100px]:self-start" />
          {!isSignedIn && (
            <Link to="/login" className="inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-full border border-[#d9ddf5] bg-white px-4 font-sans text-[0.82rem] font-bold text-[#4338a8] no-underline hover:bg-[#4f46e5] hover:text-white max-[1100px]:h-auto max-[1100px]:w-full max-[1100px]:py-[0.7rem]" onClick={() => setIsMenuOpen(false)}>
              {t('nav.signIn')} <span aria-hidden="true">↗</span>
            </Link>
          )}
          {isSignedIn && (
            <div className="group relative">
              <button
                type="button"
                className={`flex cursor-pointer items-center rounded-full border border-transparent p-0 ${isProfileOpen ? 'border-[#dbe1f4] bg-[#f5f6ff]' : 'hover:border-[#dbe1f4] hover:bg-[#f5f6ff]'}`}
                aria-label={t('home.profileOf', { name: `${firstName} ${lastName}`.trim() })}
                aria-haspopup="true"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
              >
                <span className="grid size-8 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-sans text-[0.62rem] font-extrabold text-white shadow-[0_0_0_1px_#c7d2fe]">{initials}</span>
              </button>
              <div className={`${isProfileOpen ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-[0.98] opacity-0'} absolute top-[calc(100%+0.7rem)] right-0 z-[80] flex w-[min(290px,calc(100vw-2rem))] origin-top-right flex-col rounded-xl border border-[#dbe1f4] bg-white p-4 shadow-[0_18px_42px_rgba(33,41,86,0.16)] transition group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100`} role="menu">
                <span className="mb-[0.65rem] font-sans text-[0.62rem] font-bold tracking-[0.08em] text-[#747b92] uppercase">{t('home.signedIn')}</span>
                <strong className="text-base text-[#263a6b]">{firstName} {lastName}</strong>
                <span className="mt-[0.3rem] font-sans text-[0.76rem] break-words text-[#747b92]">{email}</span>
                <button type="button" className="mt-4 cursor-pointer rounded-full border border-[#d9ddf5] bg-white px-4 py-[0.7rem] text-left font-sans text-[0.78rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white" onClick={signOut} role="menuitem">
                  {t('nav.signOut')}
                </button>
              </div>
            </div>
          )}
          </div>
        </nav>
      </div>
      </header>

      <main>
        {/* Titre et manuscrit de l'exemple. */}
        <section className={`${pageWidth} grid grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] items-center gap-12 py-16 pb-[5.5rem] text-[#1c2440] max-[860px]:grid-cols-1 max-[860px]:gap-[1.6rem]`} id="accueil">
          <div>
            <h1 className="m-0 font-sans text-[clamp(1.85rem,2.3vw,2.05rem)] leading-[1.08] font-bold tracking-[-0.045em] text-[#171c33] max-[860px]:text-[clamp(1.7rem,6vw,2.2rem)] max-[480px]:text-[1.35rem] max-[480px]:leading-[1.2]">
              {t('home.titleLine1')}<br />{t('home.titleLine2')}
            </h1>
            <p className="mt-[1.4rem] mb-0 max-w-[34rem] font-sans text-[1.05rem] leading-[1.7] text-[#5d657c]">{t('home.intro')}</p>
            <div className="mt-[1.8rem] flex flex-wrap items-center gap-[1.15rem]">
              <button type="button" className="inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-full border border-[#d9ddf5] bg-white px-[1.1rem] py-3 font-sans text-[0.95rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white" onClick={openAccount}>
                {t('home.discover')} <span aria-hidden="true">→</span>
              </button>
              <a className="inline-flex items-center gap-[0.4rem] font-sans text-[0.95rem] font-bold text-[#5b21b6] no-underline" href="#comment-ca-marche">
                {t('home.seeSteps')} <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          <figure className="relative m-0 w-full max-w-[320px] justify-self-center overflow-hidden rounded-[18px] border border-[#d4d0ea] bg-[#e8e6f2] shadow-[0_20px_46px_rgba(49,46,129,0.14)] after:pointer-events-none after:absolute after:inset-0 after:z-[2] after:bg-[linear-gradient(135deg,rgba(37,99,235,0.14),transparent_46%,rgba(124,58,237,0.18))] after:content-['']" aria-label={t('home.manuscriptAlt')}>
            <img className="block h-auto w-full" src={manuscriptPage} alt={t('home.manuscriptAlt')} />
            {/* Positions en % de l'image : 6e ligne du texte et canon dans la bordure du bas. */}
            <span className="absolute top-[56.2%] left-[8.5%] z-[3] h-[3%] w-[70%] rounded border-[1.5px] border-[#2563eb] bg-[rgba(37,99,235,0.08)] before:absolute before:top-[-4px] before:right-[-4px] before:size-[7px] before:rounded-full before:bg-[#7c3aed] before:shadow-[0_0_0_4px_rgba(124,58,237,0.18)] before:content-['']" aria-hidden="true" />
            <span className="absolute top-[80.5%] left-[46%] z-[3] h-[13.5%] w-[14%] rounded border-[1.5px] border-[#7c3aed] bg-[rgba(37,99,235,0.08)] before:absolute before:bottom-[-4px] before:left-[-4px] before:size-[7px] before:rounded-full before:bg-[#7c3aed] before:shadow-[0_0_0_4px_rgba(124,58,237,0.18)] before:content-['']" aria-hidden="true" />
            <span className="absolute top-[51.6%] left-[8.5%] z-[4] rounded-[0.3rem] border border-white/55 bg-[rgba(49,46,129,0.82)] px-[0.45rem] py-[0.3rem] font-sans text-[0.6rem] font-bold tracking-[0.11em] text-white uppercase">{t('home.line')}</span>
            <span className="absolute top-[85%] left-[62%] z-[4] rounded-[0.3rem] border border-white/55 bg-[rgba(49,46,129,0.82)] px-[0.45rem] py-[0.3rem] font-sans text-[0.6rem] font-bold tracking-[0.11em] text-white uppercase">{t('home.cannon')}</span>
          </figure>
        </section>
      </main>

      <section className="border-y border-[#e3e0ef] bg-white" aria-label={t('home.readingLabel')}>
        <div className={`${pageWidth} flex items-center justify-between gap-7 py-8 max-[980px]:flex-col max-[980px]:items-start`}>
          <p className="m-0 max-w-[520px] font-sans text-[1.02rem] leading-[1.75] font-medium text-[#1c2440]">{t('home.reading')}</p>
          <div className="flex max-w-[460px] flex-wrap gap-x-7 gap-y-[0.85rem]">
            <span className="font-sans text-[0.95rem] font-bold whitespace-nowrap text-[#5b21b6]">{t('home.recognition')}</span>
            <span className="font-sans text-[0.95rem] font-bold whitespace-nowrap text-[#5b21b6]">{t('home.analysis')}</span>
            <span className="font-sans text-[0.95rem] font-bold whitespace-nowrap text-[#5b21b6]">{t('home.understanding')}</span>
          </div>
        </div>
      </section>

      {/* Quatre cartes : reconnaître, analyser, comprendre, transcrire. */}
      <section className="scroll-mt-5 py-20 pb-[6.5rem]" id="fonctionnalites" aria-label={t('home.featuresLabel')}>
        <div className={pageWidth}>
          <div className="max-w-[670px]">
            <h2 className={sectionTitleClass}>{t('home.featuresTitle')}</h2>
          </div>
          <div className="mt-12 grid grid-cols-4 gap-4 max-[980px]:grid-cols-2 max-[480px]:grid-cols-1">
            <article className={featureCardClass}>
              <div className="mb-8 flex size-10 items-center justify-center rounded-lg bg-[#eef2ff] text-[#2563eb]" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8V5h3M16 5h3v3M20 16v3h-3M8 19H5v-3" /></svg>
              </div>
              <h3 className={cardTitleClass}>{t('home.recognize')}</h3>
              <p className={cardTextClass}>{t('home.recognizeText')}</p>
            </article>
            <article className={featureCardClass}>
              <div className="mb-8 flex size-10 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#7c3aed]" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></svg>
              </div>
              <h3 className={cardTitleClass}>{t('home.analyze')}</h3>
              <p className={cardTextClass}>{t('home.analyzeText')}</p>
            </article>
            <article className={featureCardClass}>
              <div className="mb-8 flex size-10 items-center justify-center rounded-lg bg-[#eef2ff] text-[#2563eb]" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11c.4.4.7 1 .8 1.6h4.4c.1-.6.4-1.2.8-1.6A6 6 0 0 0 12 3z" /></svg>
              </div>
              <h3 className={cardTitleClass}>{t('home.understand')}</h3>
              <p className={cardTextClass}>{t('home.understandText')}</p>
            </article>
            <article className={featureCardClass}>
              <div className="mb-8 flex size-10 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#7c3aed]" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3h7l5 5v13H7V3z" /><path d="M14 3v6h5M8 13h8M8 17h5" /></svg>
              </div>
              <h3 className={cardTitleClass}>{t('home.transcribe')}</h3>
              <p className={cardTextClass}>{t('home.transcribeText')}</p>
            </article>
          </div>
        </div>
      </section>

      {/* Quatre étapes, de l'import à la lecture conservée. */}
      <section className="scroll-mt-5 border-y border-[#e3e0ef] bg-white py-20 pb-[6.5rem]" id="comment-ca-marche" aria-label={t('home.stepsLabel')}>
        <div className={pageWidth}>
          <div className="max-w-[670px]">
            <h2 className={sectionTitleClass}>{t('home.stepsTitle')}</h2>
          </div>
          <ol className="relative mt-14 grid grid-cols-4 gap-10 before:absolute before:top-6 before:right-[12.5%] before:left-[12.5%] before:h-px before:bg-[#d4d0ea] before:content-[''] max-[980px]:grid-cols-2 max-[980px]:before:hidden max-[480px]:grid-cols-1">
            <li className="relative">
              <span className={stepNumberClass}>01</span>
              <h3 className={cardTitleClass}>{t('home.step1Title')}</h3>
              <p className={`${cardTextClass} max-w-[280px]`}>{t('home.step1Text')}</p>
            </li>
            <li className="relative">
              <span className={stepNumberClass}>02</span>
              <h3 className={cardTitleClass}>{t('home.step2Title')}</h3>
              <p className={`${cardTextClass} max-w-[280px]`}>{t('home.step2Text')}</p>
            </li>
            <li className="relative">
              <span className={stepNumberClass}>03</span>
              <h3 className={cardTitleClass}>{t('home.step3Title')}</h3>
              <p className={`${cardTextClass} max-w-[280px]`}>{t('home.step3Text')}</p>
            </li>
            <li className="relative">
              <span className={stepNumberClass}>04</span>
              <h3 className={cardTitleClass}>{t('home.step4Title')}</h3>
              <p className={`${cardTextClass} max-w-[280px]`}>{t('home.step4Text')}</p>
            </li>
          </ol>
        </div>
      </section>

      {/* Bandeau de fin de page. */}
      <section className="scroll-mt-5 py-20 pb-[6.5rem]" id="apropos">
        <div className={pageWidth}>
          <div className="rounded-2xl bg-[linear-gradient(145deg,#1e1b4b_0%,#312e81_55%,#4c1d95_100%)] px-14 py-12 text-white shadow-[0_20px_40px_rgba(49,46,129,0.18)] max-[860px]:px-[1.4rem] max-[860px]:py-8">
            <h2 className="m-0 font-sans text-[clamp(1.7rem,2.5vw,2.15rem)] leading-[1.15] font-bold tracking-[-0.035em] text-white max-[860px]:text-[clamp(1.7rem,6vw,2.2rem)] max-[480px]:text-[1.2rem]">{t('home.bannerTitle')}</h2>
            <p className="mt-5 mb-0 max-w-[520px] font-sans text-[1.05rem] leading-[1.75] text-[#eef2ff]">{t('home.bannerText')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              {isSignedIn ? (
                <button type="button" className="inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-lg border-0 bg-white px-[1.1rem] py-3 font-sans text-[0.95rem] font-bold text-[#312e81]" onClick={openAccount}>
                  {t('home.explore')} <span aria-hidden="true">↗</span>
                </button>
              ) : (
                <a className="inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-white px-[1.1rem] py-3 font-sans text-[0.95rem] font-bold text-[#312e81] no-underline" href="#fonctionnalites">
                  {t('home.explore')} <span aria-hidden="true">↗</span>
                </a>
              )}
              <a className="font-sans text-[0.92rem] font-bold text-white no-underline hover:text-[#e0e7ff]" href="#fonctionnalites">{t('home.learnMore')}</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e3e0ef] px-8 py-6 text-center font-sans text-[0.7rem] text-[#89949c]">{t('brand.name')} · {t('home.footer')}</footer>

      <button
        type="button"
        className={`fixed right-[1.15rem] bottom-[1.15rem] z-30 grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-[1.15rem] leading-none text-white shadow-[0_10px_22px_rgba(79,70,229,0.28)] transition ${showBackToTop ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'} hover:-translate-y-0.5`}
        aria-label={t('home.backToTop')}
        aria-hidden={!showBackToTop}
        tabIndex={showBackToTop ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <span aria-hidden="true">↑</span>
      </button>
    </div>
  )
}
