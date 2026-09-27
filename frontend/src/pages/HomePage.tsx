// Import des outils React nécessaires à la gestion de l'état et des événements.
import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// Import du composant de téléchargement utilisé dans cette page.
import UploadPanel from '../components/UploadPanel'

// Structure des informations visibles dans le menu du profil utilisateur.
type UserProfile = {
  firstName: string
  lastName: string
  email: string
}

// Rubriques sélectionnables du menu ; Dashboard est la seule qui contient du contenu pour l'instant.
type DashboardSection = 'dashboard' | 'analysis' | 'documents' | 'history' | 'settings'
type Language = 'fr' | 'en'

// Lit le profil sauvegardé et fournit des valeurs sûres si le stockage est vide ou invalide.
function getUserProfile(): UserProfile {
  try {
    const savedProfile = localStorage.getItem('ase_user_profile')
    const profile = savedProfile ? JSON.parse(savedProfile) as Partial<UserProfile> : {}

    return {
      firstName: profile.firstName?.trim() || 'Utilisateur',
      lastName: profile.lastName?.trim() || '',
      email: profile.email?.trim() || '',
    }
  } catch {
    return { firstName: 'Utilisateur', lastName: '', email: '' }
  }
}

// Page principale de l'application après connexion.
export default function HomePage() {
  // Le hook de navigation permet de rediriger vers la page de connexion.
  const navigate = useNavigate()

  // Le profil et l'état du menu latéral sont conservés pendant l'affichage du dashboard.
  const [userProfile] = useState<UserProfile>(getUserProfile)
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem('ase_language') === 'en' ? 'en' : 'fr',
  )
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<DashboardSection>('dashboard')

  // Les fichiers sélectionnés et leur aperçu sont stockés dans l'état local.
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const isFrench = language === 'fr'

  // Synchronise le choix de langue avec la page d'accueil et le conserve entre les visites.
  const changeLanguage = (nextLanguage: Language) => {
    localStorage.setItem('ase_language', nextLanguage)
    setLanguage(nextLanguage)
  }

  // Déconnecte l'utilisateur et le ramène à l'accueil public en gardant ses informations de profil.
  const logout = () => {
    localStorage.removeItem('ase_auth')
    setIsProfileOpen(false)
    setIsMobileMenuOpen(false)
    navigate('/')
  }

  // Produit les initiales affichées dans le bouton de profil.
  const initials = `${userProfile.firstName.charAt(0)}${userProfile.lastName.charAt(0) || userProfile.email.charAt(0)}`.toUpperCase()

  // Sélectionne une rubrique et ferme le tiroir après le choix sur mobile.
  const selectSection = (section: DashboardSection) => {
    setActiveSection(section)
    setIsMobileMenuOpen(false)
  }

  // Rouvre le Dashboard et synchronise son adresse dans le navigateur.
  const openDashboard = () => {
    selectSection('dashboard')
    navigate('/dashboard')
  }

  // Donne un titre explicite aux vues encore vides des rubriques en préparation.
  const sectionTitles: Record<DashboardSection, string> = {
    dashboard: 'Dashboard',
    analysis: isFrench ? 'Nouvelle analyse' : 'New analysis',
    documents: isFrench ? 'Documents' : 'Documents',
    history: isFrench ? 'Historique' : 'History',
    settings: isFrench ? 'Paramètres' : 'Settings',
  }

  // Gestion de la sélection d'un fichier image par l'utilisateur.
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)

    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  // Fonction de téléchargement du fichier sélectionné.
  const handleDownload = () => {
    if (!selectedFile || !previewUrl) return

    const link = document.createElement('a')
    link.href = previewUrl
    link.download = selectedFile.name
    link.click()
  }

  // Structure principale de la page d'accueil.
  return (
    <div className="home-page">
      {/* Barre supérieure volontairement réduite à l'accueil et au profil du compte. */}
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-start">
          <button
            type="button"
            className="dashboard-menu-toggle"
            aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          >
            <span>{isMobileMenuOpen ? '×' : '☰'}</span>
          </button>
          <Link to="/" className="dashboard-brand-link" aria-label="Manuscript AI, accueil">
            <span className="logo-circle">A</span>
            <span className="dashboard-brand-copy"><strong>Manuscript AI</strong><small>{isFrench ? 'Archives en mouvement' : 'Archives in motion'}</small></span>
          </Link>
        </div>

        {/* Le profil s'ouvre au survol sur ordinateur et au toucher sur mobile. */}
        <div className="dashboard-user-tools">
          <div className="language-switch dashboard-language-switch" aria-label={isFrench ? 'Choisir la langue' : 'Choose a language'}>
            <button type="button" className={isFrench ? 'active' : ''} aria-pressed={isFrench} onClick={() => changeLanguage('fr')}>FR</button>
            <button type="button" className={!isFrench ? 'active' : ''} aria-pressed={!isFrench} onClick={() => changeLanguage('en')}>EN</button>
          </div>
          <div className={`dashboard-profile ${isProfileOpen ? 'profile-menu-open' : ''}`}>
          <button
            type="button"
            className="profile-trigger"
            aria-label={`Profil de ${userProfile.firstName} ${userProfile.lastName}`}
            aria-haspopup="true"
            aria-expanded={isProfileOpen}
            onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
          >
            <span className="profile-initials">{initials}</span>
          </button>

          <div className="profile-popover" role="menu">
            <span className="profile-popover-label">{isFrench ? 'Compte connecté' : 'Signed-in account'}</span>
            <strong>{userProfile.firstName} {userProfile.lastName}</strong>
            <span className="profile-email">{userProfile.email}</span>
            <button type="button" className="profile-logout" onClick={logout} role="menuitem">
              {isFrench ? 'Se déconnecter' : 'Sign out'}
            </button>
          </div>
          </div>
        </div>
      </header>

      {/* Le fond assombri et le tiroir ne sont activés que sur les petits écrans. */}
      {isMobileMenuOpen && (
        <button
          type="button"
          className="dashboard-drawer-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="dashboard-layout">
        {/* Menu latéral : Accueil ouvre la page publique, les rubriques vides restent sélectionnables. */}
        <aside className={`sidebar dashboard-sidebar ${isMobileMenuOpen ? 'sidebar-open' : ''}`}>
          <p className="sidebar-heading">{isFrench ? 'Espace de travail' : 'Workspace'}</p>
          <nav className="sidebar-menu" aria-label={isFrench ? 'Menu du tableau de bord' : 'Dashboard menu'}>
            <Link to="/" className="sidebar-item sidebar-home-item" onClick={() => setIsMobileMenuOpen(false)}>
              <span className="sidebar-item-icon" aria-hidden="true">⌂</span>
              <span>{isFrench ? 'Accueil' : 'Home'}</span>
              <span className="sidebar-item-arrow" aria-hidden="true">↗</span>
            </Link>
            <button type="button" className={`sidebar-item ${activeSection === 'dashboard' ? 'sidebar-item-active' : ''}`} onClick={openDashboard}>
              <span className="sidebar-item-icon" aria-hidden="true">▦</span>
              <span>Dashboard</span>
              {activeSection === 'dashboard' && <span className="sidebar-item-arrow" aria-hidden="true">›</span>}
            </button>
            <button type="button" className={`sidebar-item ${activeSection === 'analysis' ? 'sidebar-item-active' : ''}`} onClick={() => selectSection('analysis')}>
              <span className="sidebar-item-icon" aria-hidden="true">＋</span>
              <span>{isFrench ? 'Nouvelle analyse' : 'New analysis'}</span>
            </button>
            <button type="button" className={`sidebar-item ${activeSection === 'documents' ? 'sidebar-item-active' : ''}`} onClick={() => selectSection('documents')}>
              <span className="sidebar-item-icon" aria-hidden="true">▤</span>
              <span>Documents</span>
            </button>
            <button type="button" className={`sidebar-item ${activeSection === 'history' ? 'sidebar-item-active' : ''}`} onClick={() => selectSection('history')}>
              <span className="sidebar-item-icon" aria-hidden="true">◷</span>
              <span>{isFrench ? 'Historique' : 'History'}</span>
            </button>
            <button type="button" className={`sidebar-item ${activeSection === 'settings' ? 'sidebar-item-active' : ''}`} onClick={() => selectSection('settings')}>
              <span className="sidebar-item-icon" aria-hidden="true">⚙</span>
              <span>{isFrench ? 'Paramètres' : 'Settings'}</span>
            </button>
          </nav>
        </aside>

        {activeSection === 'dashboard' ? <section className="content-area" id="dashboard">
          <div className="hero-card">
            <div>
              <span className="eyebrow">{isFrench ? 'Bienvenue' : 'Welcome'}</span>
              <h1>{isFrench ? 'Analyse de manuscrits & documents historiques' : 'Historical manuscripts & documents'}</h1>
              <p>
                {isFrench
                  ? 'Chargez un document ou une image pour lancer une analyse, consulter les résultats et exporter les fichiers.'
                  : 'Upload a document or image to start an analysis, review results, and export your files.'}
              </p>
            </div>

            <button type="button" className="primary-button">
              {isFrench ? 'Télécharger un document' : 'Upload a document'}
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span>{isFrench ? 'Documents traités' : 'Documents processed'}</span>
              <strong>128</strong>
            </div>
            <div className="stat-card">
              <span>{isFrench ? 'Analyses en cours' : 'Analyses in progress'}</span>
              <strong>08</strong>
            </div>
            <div className="stat-card">
              <span>{isFrench ? 'Précision' : 'Accuracy'}</span>
              <strong>94%</strong>
            </div>
          </div>

          <div className="grid-two">
            <UploadPanel
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              onFileChange={handleFileChange}
              onDownload={handleDownload}
              language={language}
            />

            <div className="panel" id="results">
              <div className="panel-header">
                <h2>{isFrench ? 'Résultats' : 'Results'}</h2>
              </div>

              <div className="result-box">
                <p className="result-label">{isFrench ? 'Texte détecté' : 'Detected text'}</p>
                <h3>{isFrench ? '“Le manuscrit est compatible avec l’archive historique.”' : '“The manuscript matches the historical archive.”'}</h3>
                <ul>
                  <li>{isFrench ? 'Confiance élevée' : 'High confidence'}</li>
                  <li>{isFrench ? 'Zone d’intérêt : page 3' : 'Area of interest: page 3'}</li>
                  <li>{isFrench ? 'Analyse terminée' : 'Analysis complete'}</li>
                </ul>
              </div>
            </div>
          </div>
        </section> : (
          /* Les rubriques sont navigables, mais restent volontairement vides tant qu'elles ne sont pas développées. */
          <section className="empty-dashboard-section" aria-live="polite">
            <span className="empty-section-mark" aria-hidden="true">✦</span>
            <p className="eyebrow">{isFrench ? 'Espace de travail' : 'Workspace'}</p>
            <h1>{sectionTitles[activeSection]}</h1>
          </section>
        )}
      </main>
    </div>
  )
}
