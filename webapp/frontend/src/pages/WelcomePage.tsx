// Import des outils nécessaires pour naviguer et changer la langue.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import manuscriptHero from '../assets/manuscript-hero.png'
import { isAuthenticated as hasSession, logout as clearSession } from '../api/auth'

// Langues disponibles sur la page publique.
type Language = 'fr' | 'en'

// Page d'accueil publique et bilingue du projet.
export default function WelcomePage() {
  const navigate = useNavigate()
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem('ase_language') === 'en' ? 'en' : 'fr',
  )
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

  // Met à jour la langue choisie pour qu'elle soit conservée entre les pages.
  const changeLanguage = (nextLanguage: Language) => {
    localStorage.setItem('ase_language', nextLanguage)
    setLanguage(nextLanguage)
  }

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
    <div className="welcome-page">
      <header className="welcome-topbar">
        <Link to="/" className="welcome-brand" aria-label="Manuscript AI">
          <span className="logo-circle">A</span>
          <span>
            <strong>Manuscript AI</strong>
            <small>{isFrench ? 'Archives en mouvement' : 'Archives in motion'}</small>
          </span>
        </Link>

        <nav className="welcome-nav" aria-label={isFrench ? 'Navigation principale' : 'Main navigation'}>
          <a className="welcome-scroll-link" href="#fonctionnalites">{isFrench ? 'Fonctionnalités' : 'Features'}</a>
          <a className="welcome-scroll-link" href="#comment-ca-marche">{isFrench ? 'Comment ça marche' : 'How it works'}</a>
          <a className="welcome-scroll-link" href="#apropos">{isFrench ? 'À propos' : 'About'}</a>
          {isAuthenticated && (
            <Link to="/dashboard" className="welcome-dashboard-link">
              {isFrench ? 'Dashboard' : 'Dashboard'} <span aria-hidden="true">↗</span>
            </Link>
          )}
          <div className="language-switch" aria-label={isFrench ? 'Choisir la langue' : 'Choose a language'}>
            <button type="button" className={isFrench ? 'active' : ''} aria-pressed={isFrench} onClick={() => changeLanguage('fr')}>FR</button>
            <button type="button" className={!isFrench ? 'active' : ''} aria-pressed={!isFrench} onClick={() => changeLanguage('en')}>EN</button>
          </div>
          {!isAuthenticated && (
            <Link to="/login" className="welcome-login-link">
              {isFrench ? 'Se connecter' : 'Sign in'} <span aria-hidden="true">↗</span>
            </Link>
          )}
          {isAuthenticated && (
            <div className={`dashboard-profile welcome-profile ${isProfileOpen ? 'profile-menu-open' : ''}`}>
              <button
                type="button"
                className="profile-trigger"
                aria-label={`${isFrench ? 'Profil de' : 'Profile of'} ${firstName} ${lastName}`}
                aria-haspopup="true"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
              >
                <span className="profile-initials">{initials}</span>
              </button>
              <div className="profile-popover" role="menu">
                <span className="profile-popover-label">{isFrench ? 'Compte connecté' : 'Signed-in account'}</span>
                <strong>{firstName} {lastName}</strong>
                <span className="profile-email">{email}</span>
                <button type="button" className="profile-logout" onClick={logout} role="menuitem">
                  {isFrench ? 'Se déconnecter' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      <main>
        <section className="ms-page ms-hero" id="accueil">
          <div className="ms-hero-copy">
            <p className="ms-kicker">{isFrench ? 'Recherche · IA · Patrimoine' : 'Research · AI · Heritage'}</p>
            <h1>
              {isFrench ? <>Donnez une nouvelle lecture aux<br />manuscrits historiques</> : <>Give historical manuscripts<br />a new reading</>}
            </h1>
            <p>
              {isFrench
                ? 'Une plateforme pour reconnaître, analyser et comprendre des documents historiques grâce à l’intelligence artificielle.'
                : 'A platform to recognize, analyze, and understand historical documents through artificial intelligence.'}
            </p>
            <div className="ms-hero-actions">
              <a className="ms-hero-cta" href="#fonctionnalites">
                {isFrench ? 'Découvrir la plateforme' : 'Discover the platform'} <span aria-hidden="true">→</span>
              </a>
              <a className="ms-hero-link" href="#comment-ca-marche">
                {isFrench ? 'Voir comment ça marche' : 'See how it works'} <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          <figure className="ms-art" aria-label={isFrench ? 'Manuscrit ancien numérisé et annoté' : 'Scanned and annotated old manuscript'}>
            <img className="ms-art-image" src={manuscriptHero} alt={isFrench ? 'Page de manuscrit ancien' : 'Page of an old manuscript'} />
            <span className="ms-scan ms-scan-one" aria-hidden="true" />
            <span className="ms-scan ms-scan-two" aria-hidden="true" />
            <span className="ms-note ms-note-line">{isFrench ? 'Ligne 04' : 'Line 04'}</span>
            <span className="ms-note ms-note-structure">Structure</span>
          </figure>
        </section>
      </main>

      <section className="ms-band" aria-label={isFrench ? 'Ce que la lecture montre' : 'What the reading shows'}>
        <div className="ms-page ms-proof">
          <p className="ms-proof-statement">
            {isFrench
              ? 'De l’image au sens, avec une approche claire et assistée par l’IA.'
              : 'From image to meaning, with a clear approach assisted by AI.'}
          </p>
          <div className="ms-proof-tags">
            <span>{isFrench ? 'Reconnaissance' : 'Recognition'}</span>
            <span>{isFrench ? 'Analyse' : 'Analysis'}</span>
            <span>{isFrench ? 'Compréhension' : 'Understanding'}</span>
          </div>
        </div>
      </section>

      <section className="ms-block" id="fonctionnalites" aria-label={isFrench ? 'Autour du manuscrit' : 'Around the manuscript'}>
        <div className="ms-page">
          <div className="ms-intro">
            <p className="ms-kicker">{isFrench ? 'Fonctionnalités' : 'Features'}</p>
            <h2>{isFrench ? 'Une approche plus claire des documents anciens' : 'A clearer approach to old documents'}</h2>
          </div>
          <div className="ms-cards">
            <article className="ms-card">
              <div className="ms-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8V5h3M16 5h3v3M20 16v3h-3M8 19H5v-3" /></svg>
              </div>
              <h3>{isFrench ? 'Reconnaître' : 'Recognize'}</h3>
              <p>{isFrench ? 'Identifier les caractères, les lignes et les structures d’un manuscrit.' : 'Identify the characters, lines, and structures of a manuscript.'}</p>
            </article>
            <article className="ms-card">
              <div className="ms-icon ms-icon-violet" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></svg>
              </div>
              <h3>{isFrench ? 'Analyser' : 'Analyze'}</h3>
              <p>{isFrench ? 'Explorer les éléments visuels et textuels d’un document numérisé.' : 'Explore the visual and textual elements of a digitized document.'}</p>
            </article>
            <article className="ms-card">
              <div className="ms-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11c.4.4.7 1 .8 1.6h4.4c.1-.6.4-1.2.8-1.6A6 6 0 0 0 12 3z" /></svg>
              </div>
              <h3>{isFrench ? 'Comprendre' : 'Understand'}</h3>
              <p>{isFrench ? 'Faire émerger le contexte et les informations importantes.' : 'Bring out the context and the important information.'}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ms-band ms-steps" id="comment-ca-marche" aria-label={isFrench ? 'Comment commencer' : 'How to begin'}>
        <div className="ms-page">
          <div className="ms-intro">
            <p className="ms-kicker">{isFrench ? 'Parcours' : 'Path'}</p>
            <h2>{isFrench ? 'Comment ça marche' : 'How it works'}</h2>
          </div>
          <ol className="ms-step-grid">
            <li>
              <span>01</span>
              <h3>{isFrench ? 'Importer un document' : 'Import a document'}</h3>
              <p>{isFrench ? 'Partagez une image ou une numérisation de votre document.' : 'Share an image or a scan of your document.'}</p>
            </li>
            <li>
              <span>02</span>
              <h3>{isFrench ? 'Laisser l’IA l’examiner' : 'Let the AI examine it'}</h3>
              <p>{isFrench ? 'Les structures, lignes et éléments remarquables sont repérés.' : 'Structures, lines, and notable elements are picked out.'}</p>
            </li>
            <li>
              <span>03</span>
              <h3>{isFrench ? 'Explorer les résultats' : 'Explore the results'}</h3>
              <p>{isFrench ? 'Parcourez les informations utiles avec un regard renouvelé.' : 'Browse the useful information with a fresh look.'}</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="ms-block" id="apropos">
        <div className="ms-page">
          <div className="ms-banner">
            <p className="ms-kicker">Manuscript AI</p>
            <h2>{isFrench ? 'Commencez par regarder autrement' : 'Start by looking differently'}</h2>
            <p>
              {isFrench
                ? 'Découvrez une expérience pensée pour rapprocher l’histoire, l’image et l’intelligence artificielle.'
                : 'Discover an experience designed to bring history, the image, and artificial intelligence closer.'}
            </p>
            <div className="ms-banner-actions">
              {isAuthenticated ? (
                <button type="button" className="ms-banner-cta" onClick={openWorkspace}>
                  {isFrench ? 'Explorer le projet' : 'Explore the project'} <span aria-hidden="true">↗</span>
                </button>
              ) : (
                <a className="ms-banner-cta" href="#fonctionnalites">
                  {isFrench ? 'Explorer le projet' : 'Explore the project'} <span aria-hidden="true">↗</span>
                </a>
              )}
              <a className="ms-banner-link" href="#fonctionnalites">{isFrench ? 'En savoir plus' : 'Learn more'}</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="welcome-footer ase-foot">Manuscript AI · {isFrench ? 'Reconnaître, analyser et comprendre les documents historiques' : 'Recognize, analyze, and understand historical documents'}</footer>
    </div>
  )
}
