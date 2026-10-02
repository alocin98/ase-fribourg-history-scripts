// Import des outils nécessaires pour naviguer et changer la langue.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Language } from '../i18n'
import manuscriptHero from '../assets/manuscript-hero.png'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { isAuthenticated as hasSession, logout as clearSession } from '../api/auth'

// Page d'accueil publique et bilingue du projet.
export default function WelcomePage() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const language: Language = i18n.resolvedLanguage === 'fr' ? 'fr' : 'en'
  const isFrench = language === 'fr'
  const isAuthenticated = hasSession()
  const userProfile = (() => {
    try {
      const saved = localStorage.getItem('ase_user_profile')
      return saved ? JSON.parse(saved) as { firstName?: string; lastName?: string; email?: string } : null
    } catch {
      return null
    }
  })()
  const firstName = userProfile?.firstName?.trim() || 'Utilisateur'
  const lastName = userProfile?.lastName?.trim() || ''
  const email = userProfile?.email?.trim() || ''
  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || email.charAt(0)}`.toUpperCase()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Le défilement vers les ancres ne concerne que cette page.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.scrollBehavior
    root.style.scrollBehavior = 'smooth'
    return () => {
      root.style.scrollBehavior = previous
    }
  }, [])

  // Ferme la session depuis l'accueil sans quitter cette page.
  const logout = () => {
    clearSession()
    setIsProfileOpen(false)
    navigate('/')
  }

  // Une action de travail demande une connexion si l'utilisateur est nouveau.
  const openWorkspace = () => {
    navigate(hasSession() ? '/dashboard' : '/login')
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f1e9] text-[#18333a]">
      <header className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-y-3 border-b border-[#7b918f]/25 px-4 py-4 max-sm:flex-col max-sm:items-start sm:px-8 sm:py-[1.35rem]">
        <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Manuscript AI">
          <span className="logo-mark">A</span>
          <span>
            <strong className="block text-[0.95rem] tracking-[0.02em]">Manuscript AI</strong>
            <small className="mt-0.5 block text-[0.65rem] text-[#65797b] max-sm:text-[0.58rem]">{isFrench ? 'Archives en mouvement' : 'Archives in motion'}</small>
          </span>
        </Link>

        <nav className="flex w-full flex-wrap items-center justify-start gap-x-4 gap-y-3 text-[0.82rem] max-sm:text-[0.7rem] lg:w-auto lg:flex-nowrap lg:justify-end lg:gap-[1.4rem]" aria-label={isFrench ? 'Navigation principale' : 'Main navigation'}>
          <a className={scrollLinkClass} href="#fonctionnalites">{isFrench ? 'Fonctionnalités' : 'Features'}</a>
          <a className={scrollLinkClass} href="#comment-ca-marche">{isFrench ? 'Comment ça marche' : 'How it works'}</a>
          <a className={scrollLinkClass} href="#apropos">{isFrench ? 'À propos' : 'About'}</a>
          {isAuthenticated && (
            <Link to="/dashboard" className="btn-primary flex-none text-[0.76rem]">
              {isFrench ? 'Dashboard' : 'Dashboard'} <span aria-hidden="true">↗</span>
            </Link>
          )}
          <LanguageSwitcher />
          {!isAuthenticated && (
            <Link to="/login" className="btn-primary group/login text-[0.78rem]">
              {isFrench ? 'Se connecter' : 'Sign in'} <span className="inline-block transition-transform group-hover/login:translate-x-[3px] group-hover/login:-translate-y-[3px]" aria-hidden="true">↗</span>
            </Link>
          )}
          {isAuthenticated && (
            <div className="group relative flex-none" data-open={isProfileOpen || undefined}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-transparent py-1 pr-1.5 pl-1 transition hover:border-[#dbe1f4] hover:bg-[#f5f6ff] focus-visible:border-[#dbe1f4] focus-visible:bg-[#f5f6ff] aria-expanded:border-[#dbe1f4] aria-expanded:bg-[#f5f6ff] motion-reduce:transition-none"
                aria-label={`${isFrench ? 'Profil de' : 'Profile of'} ${firstName} ${lastName}`}
                aria-haspopup="true"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
              >
                <span className="grid size-[2.55rem] place-items-center rounded-full border-2 border-white bg-ase-gradient text-[0.76rem] font-extrabold text-white shadow-[0_0_0_1px_#c7d2fe] max-sm:size-9">{initials}</span>
              </button>
              <div className="pointer-events-none absolute top-[calc(100%+0.7rem)] right-0 z-80 flex w-[min(290px,calc(100vw-2rem))] origin-top-right translate-y-2 scale-[0.98] flex-col rounded-xl border border-[#dbe1f4] bg-white p-4 opacity-0 shadow-[0_18px_42px_rgb(33_41_86/0.16)] transition duration-200 menu-open:pointer-events-auto menu-open:translate-y-0 menu-open:scale-100 menu-open:opacity-100 motion-reduce:transition-none max-sm:right-auto max-sm:left-0 max-sm:origin-top-left" role="menu">
                <span className="mb-2.5 text-[0.62rem] font-bold tracking-[0.08em] text-[#747b92] uppercase">{isFrench ? 'Compte connecté' : 'Signed-in account'}</span>
                <strong className="text-ase-navy">{firstName} {lastName}</strong>
                <span className="mt-1 text-[0.76rem] wrap-anywhere text-[#747b92]">{email}</span>
                <button type="button" className="mt-4 rounded-[7px] bg-ase-gradient px-3 py-2.5 text-left text-[0.78rem] font-bold text-white transition hover:-translate-y-px hover:bg-indigo-800 hover:bg-none motion-reduce:transition-none" onClick={logout} role="menuitem">
                  {isFrench ? 'Se déconnecter' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      <main>
        <section className={`${pageClass} grid scroll-mt-5 items-center gap-[1.6rem] pt-16 pb-[5.5rem] md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] md:gap-12`} id="accueil">
          <div>
            <p className={`${kickerClass} text-violet-700`}>{isFrench ? 'Recherche · IA · Patrimoine' : 'Research · AI · Heritage'}</p>
            <h1 className="text-[clamp(1.7rem,6vw,2.2rem)] leading-[1.08] font-bold tracking-[-0.045em] text-[#171c33] md:text-[clamp(1.85rem,2.3vw,2.05rem)]">
              {isFrench ? <>Donnez une nouvelle lecture aux<br />manuscrits historiques</> : <>Give historical manuscripts<br />a new reading</>}
            </h1>
            <p className="mt-[1.4rem] max-w-[34rem] text-[1.05rem] leading-[1.7] text-[#5d657c]">
              {isFrench
                ? 'Une plateforme pour reconnaître, analyser et comprendre des documents historiques grâce à l’intelligence artificielle.'
                : 'A platform to recognize, analyze, and understand historical documents through artificial intelligence.'}
            </p>
            <div className="mt-[1.8rem] flex flex-wrap items-center gap-[1.15rem]">
              <a className="btn-primary min-h-[46px] text-[0.95rem]" href="#fonctionnalites">
                {isFrench ? 'Découvrir la plateforme' : 'Discover the platform'} <span aria-hidden="true">→</span>
              </a>
              <a className="inline-flex items-center gap-1.5 text-[0.95rem] font-bold text-violet-800" href="#comment-ca-marche">
                {isFrench ? 'Voir comment ça marche' : 'See how it works'} <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          <figure className="relative min-h-[320px] animate-ase-float overflow-hidden rounded-[18px] border border-[#d4d0ea] bg-[#e8e6f2] shadow-[0_20px_46px_rgb(49_46_129/0.14)] after:pointer-events-none after:absolute after:inset-0 after:z-2 after:bg-linear-135 after:from-blue-600/15 after:via-transparent after:via-45% after:to-violet-600/20 motion-reduce:animate-none md:min-h-[420px]" aria-label={isFrench ? 'Manuscrit ancien numérisé et annoté' : 'Scanned and annotated old manuscript'}>
            <img className="absolute inset-0 size-full object-cover" src={manuscriptHero} alt={isFrench ? 'Page de manuscrit ancien' : 'Page of an old manuscript'} />
            <span className={`${scanClass} top-[17%] left-[13%] h-[18%] w-[58%] border-ase-blue before:-top-1 before:-right-1`} aria-hidden="true" />
            <span className={`${scanClass} top-[47%] right-[10%] h-[22%] w-[42%] border-ase-violet before:-bottom-1 before:-left-1`} aria-hidden="true" />
            <span className={`${noteClass} top-[16%] left-[16%]`}>{isFrench ? 'Ligne 04' : 'Line 04'}</span>
            <span className={`${noteClass} right-[8%] bottom-[11%]`}>Structure</span>
          </figure>
        </section>
      </main>

      <section className="border-y border-[#e3e0ef] bg-white" aria-label={isFrench ? 'Ce que la lecture montre' : 'What the reading shows'}>
        <div className={`${pageClass} flex flex-col items-start gap-7 py-8 lg:flex-row lg:items-center lg:justify-between`}>
          <p className="max-w-[520px] text-[1.02rem] leading-[1.75] font-medium text-[#1c2440]">
            {isFrench
              ? 'De l’image au sens, avec une approche claire et assistée par l’IA.'
              : 'From image to meaning, with a clear approach assisted by AI.'}
          </p>
          <div className="flex max-w-[460px] flex-wrap gap-x-7 gap-y-3.5 text-[0.95rem] font-bold whitespace-nowrap text-violet-800">
            <span>{isFrench ? 'Reconnaissance' : 'Recognition'}</span>
            <span>{isFrench ? 'Analyse' : 'Analysis'}</span>
            <span>{isFrench ? 'Compréhension' : 'Understanding'}</span>
          </div>
        </div>
      </section>

      <section className="scroll-mt-5 pt-20 pb-[6.5rem]" id="fonctionnalites" aria-label={isFrench ? 'Autour du manuscrit' : 'Around the manuscript'}>
        <div className={pageClass}>
          <div className="max-w-[670px]">
            <p className={`${kickerClass} text-violet-700`}>{isFrench ? 'Fonctionnalités' : 'Features'}</p>
            <h2 className={`${sectionTitleClass} text-[#171c33]`}>{isFrench ? 'Une approche plus claire des documents anciens' : 'A clearer approach to old documents'}</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className={cardClass}>
              <div className={`${iconClass} bg-indigo-50 text-ase-blue`} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8V5h3M16 5h3v3M20 16v3h-3M8 19H5v-3" /></svg>
              </div>
              <h3 className={itemTitleClass}>{isFrench ? 'Reconnaître' : 'Recognize'}</h3>
              <p className={itemTextClass}>{isFrench ? 'Identifier les caractères, les lignes et les structures d’un manuscrit.' : 'Identify the characters, lines, and structures of a manuscript.'}</p>
            </article>
            <article className={cardClass}>
              <div className={`${iconClass} bg-violet-50 text-ase-violet`} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></svg>
              </div>
              <h3 className={itemTitleClass}>{isFrench ? 'Analyser' : 'Analyze'}</h3>
              <p className={itemTextClass}>{isFrench ? 'Explorer les éléments visuels et textuels d’un document numérisé.' : 'Explore the visual and textual elements of a digitized document.'}</p>
            </article>
            <article className={cardClass}>
              <div className={`${iconClass} bg-indigo-50 text-ase-blue`} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11c.4.4.7 1 .8 1.6h4.4c.1-.6.4-1.2.8-1.6A6 6 0 0 0 12 3z" /></svg>
              </div>
              <h3 className={itemTitleClass}>{isFrench ? 'Comprendre' : 'Understand'}</h3>
              <p className={itemTextClass}>{isFrench ? 'Faire émerger le contexte et les informations importantes.' : 'Bring out the context and the important information.'}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="scroll-mt-5 border-y border-[#e3e0ef] bg-white pt-20 pb-[6.5rem]" id="comment-ca-marche" aria-label={isFrench ? 'Comment commencer' : 'How to begin'}>
        <div className={pageClass}>
          <div className="max-w-[670px]">
            <p className={`${kickerClass} text-violet-700`}>{isFrench ? 'Parcours' : 'Path'}</p>
            <h2 className={`${sectionTitleClass} text-[#171c33]`}>{isFrench ? 'Comment ça marche' : 'How it works'}</h2>
          </div>
          <ol className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:before:absolute lg:before:inset-x-[16.5%] lg:before:top-6 lg:before:h-px lg:before:bg-[#d4d0ea]">
            <li className="relative">
              <span className={stepNumberClass}>01</span>
              <h3 className={itemTitleClass}>{isFrench ? 'Importer un document' : 'Import a document'}</h3>
              <p className={`${itemTextClass} max-w-[280px]`}>{isFrench ? 'Partagez une image ou une numérisation de votre document.' : 'Share an image or a scan of your document.'}</p>
            </li>
            <li className="relative">
              <span className={stepNumberClass}>02</span>
              <h3 className={itemTitleClass}>{isFrench ? 'Laisser l’IA l’examiner' : 'Let the AI examine it'}</h3>
              <p className={`${itemTextClass} max-w-[280px]`}>{isFrench ? 'Les structures, lignes et éléments remarquables sont repérés.' : 'Structures, lines, and notable elements are picked out.'}</p>
            </li>
            <li className="relative">
              <span className={stepNumberClass}>03</span>
              <h3 className={itemTitleClass}>{isFrench ? 'Explorer les résultats' : 'Explore the results'}</h3>
              <p className={`${itemTextClass} max-w-[280px]`}>{isFrench ? 'Parcourez les informations utiles avec un regard renouvelé.' : 'Browse the useful information with a fresh look.'}</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="scroll-mt-5 pt-20 pb-[6.5rem]" id="apropos">
        <div className={pageClass}>
          <div className="rounded-2xl bg-linear-145 from-indigo-950 via-indigo-900 to-violet-900 px-[1.4rem] py-8 text-white shadow-[0_20px_40px_rgb(49_46_129/0.18)] md:px-14 md:py-12">
            <p className={`${kickerClass} text-indigo-100`}>Manuscript AI</p>
            <h2 className={`${sectionTitleClass} text-white`}>{isFrench ? 'Commencez par regarder autrement' : 'Start by looking differently'}</h2>
            <p className="mt-5 max-w-[520px] text-[1.05rem] leading-[1.75] text-indigo-50">
              {isFrench
                ? 'Découvrez une expérience pensée pour rapprocher l’histoire, l’image et l’intelligence artificielle.'
                : 'Discover an experience designed to bring history, the image, and artificial intelligence closer.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              {isAuthenticated ? (
                <button type="button" className={bannerCtaClass} onClick={openWorkspace}>
                  {isFrench ? 'Explorer le projet' : 'Explore the project'} <span aria-hidden="true">↗</span>
                </button>
              ) : (
                <a className={bannerCtaClass} href="#fonctionnalites">
                  {isFrench ? 'Explorer le projet' : 'Explore the project'} <span aria-hidden="true">↗</span>
                </a>
              )}
              <a className="text-[0.92rem] font-bold text-white hover:text-indigo-100" href="#fonctionnalites">{isFrench ? 'En savoir plus' : 'Learn more'}</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e3e0ef] px-8 py-6 text-center text-[0.7rem] text-[#89949c]">Manuscript AI · {isFrench ? 'Reconnaître, analyser et comprendre les documents historiques' : 'Recognize, analyze, and understand historical documents'}</footer>
    </div>
  )
}

// Classes répétées dans les sections de la page d'accueil.
const pageClass = 'mx-auto w-[min(680px,calc(100%-2rem))] text-[#1c2440] md:w-[min(1120px,calc(100%-3rem))]'
const scrollLinkClass = 'font-bold whitespace-nowrap text-[#5d657c] transition-colors hover:text-violet-700'
const kickerClass = 'mb-4 text-[0.72rem] font-extrabold tracking-[0.15em] uppercase'
const sectionTitleClass = 'text-[clamp(1.7rem,6vw,2.2rem)] leading-[1.15] font-bold tracking-[-0.035em] max-sm:text-[1.2rem] md:text-[clamp(1.7rem,2.5vw,2.15rem)] md:whitespace-nowrap'
const scanClass = 'absolute z-3 rounded border-[1.5px] bg-ase-blue/8 before:absolute before:size-[7px] before:rounded-full before:bg-ase-violet before:shadow-[0_0_0_4px_rgb(124_58_237/0.18)]'
const noteClass = 'absolute z-4 rounded-[0.3rem] border border-white/55 bg-[rgb(49_46_129/0.82)] px-2.5 py-[0.45rem] text-[0.68rem] font-bold tracking-[0.11em] text-white uppercase'
const cardClass = 'rounded-xl border border-[#e3e0ef] bg-white p-7 shadow-[0_8px_20px_rgb(49_46_129/0.035)]'
const iconClass = 'mb-8 flex size-10 items-center justify-center rounded-lg'
const itemTitleClass = 'text-[1.05rem] font-bold whitespace-nowrap text-indigo-950'
const itemTextClass = 'mt-3 text-[0.95rem] leading-[1.7] text-[#5d657c]'
const stepNumberClass = 'relative z-1 mb-5 flex size-12 items-center justify-center rounded-full border border-violet-300 bg-[#f8f7f4] text-[0.85rem] font-extrabold text-ase-blue'
const bannerCtaClass = 'inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-white px-[1.1rem] py-3 text-[0.95rem] font-bold text-indigo-900 transition hover:-translate-y-0.5'
