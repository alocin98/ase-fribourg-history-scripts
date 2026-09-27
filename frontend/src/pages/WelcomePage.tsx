// Import des outils nécessaires pour naviguer et changer la langue.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// Langues disponibles sur la page publique.
type Language = 'fr' | 'en'

// Page d'accueil publique et bilingue du projet.
export default function WelcomePage() {
  const navigate = useNavigate()
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem('ase_language') === 'en' ? 'en' : 'fr',
  )
  const isFrench = language === 'fr'
  const isAuthenticated = localStorage.getItem('ase_auth') === 'true'
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

  // Met à jour la langue choisie pour qu'elle soit conservée entre les pages.
  const changeLanguage = (nextLanguage: Language) => {
    localStorage.setItem('ase_language', nextLanguage)
    setLanguage(nextLanguage)
  }

  // Ferme la session depuis l'accueil sans quitter cette page.
  const logout = () => {
    localStorage.removeItem('ase_auth')
    setIsProfileOpen(false)
    navigate('/')
  }

  // Une action de travail demande une connexion si l'utilisateur est nouveau.
  const openWorkspace = () => {
    const isAuthenticated = !!localStorage.getItem('ase_auth')
    navigate(isAuthenticated ? '/dashboard' : '/login')
  }

  return (
    <div className="welcome-page">
      <header className="welcome-topbar">
        <Link to="/" className="welcome-brand" aria-label="ASE Project">
          <span className="logo-circle">A</span>
          <span>
            <strong>ASE Project</strong>
            <small>{isFrench ? 'Archives en mouvement' : 'Archives in motion'}</small>
          </span>
        </Link>

        <nav className="welcome-nav" aria-label={isFrench ? 'Navigation principale' : 'Main navigation'}>
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

      <main className="welcome-main">
        <section className="welcome-hero welcome-hero-new" id="projet">
          <div className="welcome-hero-copy">
            <span className="eyebrow">{isFrench ? 'ASE · Atelier de recherche historique' : 'ASE · Historical research workspace'}</span>
            <h1>{isFrench ? 'Chaque archive ouvre une nouvelle piste.' : 'Every archive opens a new trail.'}</h1>
            <p>
              {isFrench
                ? 'Importez un document, explorez son contenu et retrouvez facilement vos analyses. Votre travail commence ici.'
                : 'Upload a document, explore its contents, and return to your analyses whenever you need. Your work starts here.'}
            </p>
            <div className="welcome-actions">
              <button type="button" className="primary-button" onClick={openWorkspace}>
                {isFrench ? 'Ouvrir mon espace de travail' : 'Open my workspace'} <span aria-hidden="true">↗</span>
              </button>
              {!isAuthenticated && <Link to="/register" className="text-button">{isFrench ? 'Créer un compte' : 'Create an account'} →</Link>}
            </div>
          </div>

          <div className="welcome-visual welcome-workspace-preview" aria-label={isFrench ? 'Aperçu de l’espace de travail' : 'Workspace preview'}>
            <div className="workspace-preview-top">
              <span>{isFrench ? 'ESPACE DE TRAVAIL' : 'WORKSPACE'}</span>
              <span className="workspace-live"><i />{isFrench ? 'Prêt' : 'Ready'}</span>
            </div>
            <div className="workspace-preview-title">
              <span>{isFrench ? 'Votre recherche' : 'Your research'}</span>
              <strong>{isFrench ? 'Commencez par une source' : 'Begin with a source'}</strong>
            </div>
            <div className="workspace-drop-zone">
              <span className="drop-icon">↑</span>
              <strong>{isFrench ? 'Déposez un document' : 'Drop in a document'}</strong>
              <small>{isFrench ? 'Images et documents historiques' : 'Images and historical documents'}</small>
            </div>
            <div className="workspace-preview-footer"><span>01</span><span>{isFrench ? 'Importer' : 'Import'}</span><i /><span>02</span><span>{isFrench ? 'Analyser' : 'Analyse'}</span><i /><span>03</span><span>{isFrench ? 'Conserver' : 'Keep'}</span></div>
          </div>
        </section>

        <section className="welcome-hub welcome-hub-new" aria-label={isFrench ? 'Navigation du projet' : 'Project navigation'}>
          <div className="hub-heading">
            <div><span className="eyebrow">{isFrench ? 'Navigation du projet' : 'Project navigation'}</span><h2>{isFrench ? 'Où voulez-vous aller ?' : 'Where would you like to go?'}</h2></div>
            <p>{isFrench ? 'Choisissez une rubrique pour continuer.' : 'Choose a section to continue.'}</p>
          </div>
          <div className="hub-grid">
            <button type="button" className="welcome-destination destination-upload" onClick={openWorkspace}><span className="destination-icon">↑</span><span className="destination-index">01 / {isFrench ? 'ACTION' : 'ACTION'}</span><strong>{isFrench ? 'Importer un document' : 'Import a document'}</strong><small>{isFrench ? 'Ajouter une image ou un fichier à analyser.' : 'Add an image or file to analyse.'}</small><span className="destination-arrow">↗</span></button>
            <button type="button" className="welcome-destination destination-work" onClick={openWorkspace}><span className="destination-icon">▦</span><span className="destination-index">02 / {isFrench ? 'ESPACE' : 'WORKSPACE'}</span><strong>{isFrench ? 'Mon tableau de bord' : 'My dashboard'}</strong><small>{isFrench ? 'Retrouver les outils de votre espace.' : 'Return to your workspace tools.'}</small><span className="destination-arrow">↗</span></button>
            <a href="#parcours" className="welcome-destination destination-guide"><span className="destination-icon">✳</span><span className="destination-index">03 / {isFrench ? 'GUIDE' : 'GUIDE'}</span><strong>{isFrench ? 'Comprendre le parcours' : 'Explore the process'}</strong><small>{isFrench ? 'Voir comment une source devient une analyse.' : 'See how a source becomes an analysis.'}</small><span className="destination-arrow">↓</span></a>
          </div>
        </section>

        <section className="welcome-process welcome-process-new" id="parcours" aria-label={isFrench ? 'Parcours d’une source' : 'Source workflow'}>
          <div className="process-intro">
            <span className="eyebrow">{isFrench ? 'Un parcours lisible' : 'A clear process'}</span>
            <h2>{isFrench ? 'De la source au résultat, sans perdre le fil.' : 'From source to result, keep the thread.'}</h2>
            <p>{isFrench ? 'Les pages Analyse, Documents et Historique sont prévues dans la navigation. Le Dashboard rassemble actuellement les outils disponibles.' : 'Analysis, Documents, and History are planned in the navigation. The Dashboard currently brings together the available tools.'}</p>
          </div>
          <div className="process-list">
            <article><span>01</span><div><h3>{isFrench ? 'Importer' : 'Import'}</h3><p>{isFrench ? 'Choisissez le document historique qui vous intéresse.' : 'Choose the historical document you want to explore.'}</p></div></article>
            <article><span>02</span><div><h3>{isFrench ? 'Examiner' : 'Examine'}</h3><p>{isFrench ? 'Prévisualisez la source et consultez les éléments disponibles.' : 'Preview the source and review the available details.'}</p></div></article>
            <article><span>03</span><div><h3>{isFrench ? 'Poursuivre' : 'Continue'}</h3><p>{isFrench ? 'Téléchargez le fichier ou revenez plus tard à votre espace.' : 'Download the file or return to your workspace later.'}</p></div></article>
          </div>
        </section>
      </main>

      <footer className="welcome-footer">ASE Project · {isFrench ? 'Recherche historique augmentée' : 'Augmented historical research'}</footer>
    </div>
  )
}
