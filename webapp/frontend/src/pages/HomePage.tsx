// Import des outils React nécessaires à la gestion de l'état et des événements.
import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Language } from '../i18n'

// Import du composant de téléchargement utilisé dans cette page.
import UploadPanel from '../components/UploadPanel'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { logout as clearSession } from '../api/auth'

// Structure des informations visibles dans le menu du profil utilisateur.
type UserProfile = {
  firstName: string
  lastName: string
  email: string
}

// Rubriques sélectionnables du menu ; Dashboard est la seule qui contient du contenu pour l'instant.
type DashboardSection = 'dashboard' | 'analysis' | 'documents' | 'history' | 'settings'

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
  const { i18n } = useTranslation()
  const language: Language = i18n.resolvedLanguage === 'fr' ? 'fr' : 'en'
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<DashboardSection>('dashboard')

  // Les fichiers sélectionnés et leur aperçu sont stockés dans l'état local.
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const isFrench = language === 'fr'

  // Déconnecte l'utilisateur et le ramène à l'accueil public.
  const logout = () => {
    clearSession()
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

  // Classes des entrées du menu latéral, avec la barre d'accent pour la rubrique active.
  const sidebarItemClass = (section?: DashboardSection) => [
    'relative grid min-h-[2.8rem] w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[0.78rem] text-[#59627d] transition hover:translate-x-[3px] hover:bg-[#f1f0ff] hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 motion-reduce:transition-none',
    section && activeSection === section
      ? 'bg-indigo-50 font-extrabold text-indigo-800 before:absolute before:inset-y-[0.55rem] before:left-0 before:w-[3px] before:rounded before:bg-ase-indigo'
      : '',
  ].join(' ')

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
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {/* Barre supérieure volontairement réduite à l'accueil et au profil du compte. */}
      <header className="sticky top-0 z-50 flex min-h-[60px] items-center justify-between border-b border-[#e1e8e5] bg-white/95 px-3 py-2 backdrop-blur-md sm:px-4 lg:min-h-[68px] lg:px-8 lg:py-3">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <button
            type="button"
            className="grid size-10 place-items-center rounded-[9px] border border-[#dbe1f4] bg-white text-xl text-ase-navy transition hover:bg-ase-indigo hover:text-white focus-visible:bg-ase-indigo focus-visible:text-white lg:hidden"
            aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          >
            <span>{isMobileMenuOpen ? '×' : '☰'}</span>
          </button>
          <Link to="/" className="inline-flex items-center gap-2.5 text-[#25345f]" aria-label="Manuscript AI, accueil">
            <span className="logo-mark max-sm:size-[38px]">A</span>
            <span className="flex flex-col gap-0.5 leading-tight">
              <strong className="text-[0.95rem] font-extrabold text-ase-ink">Manuscript AI</strong>
              <small className="text-[0.65rem] text-ase-muted max-sm:text-[0.58rem]">{isFrench ? 'Archives en mouvement' : 'Archives in motion'}</small>
            </span>
          </Link>
        </div>

        {/* Le profil s'ouvre au survol sur ordinateur et au toucher sur mobile. */}
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
          <LanguageSwitcher />
          <div className="group relative" data-open={isProfileOpen || undefined}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-transparent py-1 pr-1.5 pl-1 transition hover:border-[#dbe1f4] hover:bg-[#f5f6ff] focus-visible:border-[#dbe1f4] focus-visible:bg-[#f5f6ff] aria-expanded:border-[#dbe1f4] aria-expanded:bg-[#f5f6ff] motion-reduce:transition-none"
              aria-label={`Profil de ${userProfile.firstName} ${userProfile.lastName}`}
              aria-haspopup="true"
              aria-expanded={isProfileOpen}
              onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
            >
              <span className="grid size-[2.55rem] place-items-center rounded-full border-2 border-white bg-ase-gradient text-[0.76rem] font-extrabold text-white shadow-[0_0_0_1px_#c7d2fe] max-sm:size-[2.3rem]">{initials}</span>
            </button>

            <div className="pointer-events-none absolute top-[calc(100%+0.7rem)] right-0 z-80 flex w-[min(290px,calc(100vw-2rem))] origin-top-right translate-y-2 scale-[0.98] flex-col rounded-xl border border-[#dbe1f4] bg-white p-4 opacity-0 shadow-[0_18px_42px_rgb(33_41_86/0.16)] transition duration-200 menu-open:pointer-events-auto menu-open:translate-y-0 menu-open:scale-100 menu-open:opacity-100 motion-reduce:transition-none" role="menu">
              <span className="mb-2.5 text-[0.62rem] font-bold tracking-[0.08em] text-[#747b92] uppercase">{isFrench ? 'Compte connecté' : 'Signed-in account'}</span>
              <strong className="text-ase-navy">{userProfile.firstName} {userProfile.lastName}</strong>
              <span className="mt-1 text-[0.76rem] wrap-anywhere text-[#747b92]">{userProfile.email}</span>
              <button type="button" className="mt-4 rounded-[7px] bg-ase-gradient px-3 py-2.5 text-left text-[0.78rem] font-bold text-white transition hover:-translate-y-px hover:bg-indigo-800 hover:bg-none motion-reduce:transition-none" onClick={logout} role="menuitem">
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
          className="fixed inset-0 z-60 bg-[rgb(31_41_86/0.36)] backdrop-blur-[2px] lg:hidden"
          aria-label="Fermer le menu"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="block p-3 sm:p-[1.1rem] lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-8 lg:pt-6 lg:pb-8">
        {/* Menu latéral : Accueil ouvre la page publique, les rubriques vides restent sélectionnables. */}
        <aside className={`fixed inset-y-0 left-0 z-70 flex min-h-screen w-[min(290px,84vw)] min-w-0 flex-col rounded-r-2xl border border-slate-200 bg-white px-3.5 py-5 shadow-[0_8px_24px_rgb(34_43_87/0.05)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none lg:sticky lg:top-[84px] lg:z-auto lg:min-h-[calc(100vh-100px)] lg:w-auto lg:translate-x-0 lg:rounded-xl lg:px-3 lg:py-4 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[105%]'}`}>
          <p className="mb-3.5 ml-2 text-[0.65rem] font-extrabold tracking-[0.1em] text-[#7b8196] uppercase">{isFrench ? 'Espace de travail' : 'Workspace'}</p>
          <nav className="flex flex-col gap-1" aria-label={isFrench ? 'Menu du tableau de bord' : 'Dashboard menu'}>
            <Link to="/" className={sidebarItemClass()} onClick={() => setIsMobileMenuOpen(false)}>
              <span className="grid size-[1.4rem] place-items-center text-base text-[#697392]" aria-hidden="true">⌂</span>
              <span>{isFrench ? 'Accueil' : 'Home'}</span>
              <span className="text-xl text-ase-indigo" aria-hidden="true">↗</span>
            </Link>
            <button type="button" className={sidebarItemClass('dashboard')} onClick={openDashboard}>
              <span className="grid size-[1.4rem] place-items-center text-base text-[#697392]" aria-hidden="true">▦</span>
              <span>Dashboard</span>
              {activeSection === 'dashboard' && <span className="text-xl text-ase-indigo" aria-hidden="true">›</span>}
            </button>
            <button type="button" className={sidebarItemClass('analysis')} onClick={() => selectSection('analysis')}>
              <span className="grid size-[1.4rem] place-items-center text-base text-[#697392]" aria-hidden="true">＋</span>
              <span>{isFrench ? 'Nouvelle analyse' : 'New analysis'}</span>
            </button>
            <button type="button" className={sidebarItemClass('documents')} onClick={() => selectSection('documents')}>
              <span className="grid size-[1.4rem] place-items-center text-base text-[#697392]" aria-hidden="true">▤</span>
              <span>Documents</span>
            </button>
            <button type="button" className={sidebarItemClass('history')} onClick={() => selectSection('history')}>
              <span className="grid size-[1.4rem] place-items-center text-base text-[#697392]" aria-hidden="true">◷</span>
              <span>{isFrench ? 'Historique' : 'History'}</span>
            </button>
            <button type="button" className={sidebarItemClass('settings')} onClick={() => selectSection('settings')}>
              <span className="grid size-[1.4rem] place-items-center text-base text-[#697392]" aria-hidden="true">⚙</span>
              <span>{isFrench ? 'Paramètres' : 'Settings'}</span>
            </button>
          </nav>
        </aside>

        {activeSection === 'dashboard' ? <section className="flex w-full min-w-0 flex-col gap-5" id="dashboard">
          <div className="card-surface flex flex-col items-start justify-between gap-4 bg-linear-135 from-blue-50 to-indigo-50 p-6 lg:flex-row lg:items-center">
            <div>
              <span className="eyebrow">{isFrench ? 'Bienvenue' : 'Welcome'}</span>
              <h1 className="mt-1.5 text-[clamp(2rem,3vw,3rem)] leading-[1.1] font-bold text-gray-900">{isFrench ? 'Analyse de manuscrits & documents historiques' : 'Historical manuscripts & documents'}</h1>
              <p className="mt-3 max-w-[620px] leading-relaxed text-gray-600">
                {isFrench
                  ? 'Chargez un document ou une image pour lancer une analyse, consulter les résultats et exporter les fichiers.'
                  : 'Upload a document or image to start an analysis, review results, and export your files.'}
              </p>
            </div>

            <button type="button" className="btn-primary shrink-0">
              {isFrench ? 'Télécharger un document' : 'Upload a document'}
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card-surface p-5 text-gray-600">
              <span>{isFrench ? 'Documents traités' : 'Documents processed'}</span>
              <strong className="mt-3 block text-[2rem] text-gray-900">128</strong>
            </div>
            <div className="card-surface p-5 text-gray-600">
              <span>{isFrench ? 'Analyses en cours' : 'Analyses in progress'}</span>
              <strong className="mt-3 block text-[2rem] text-gray-900">08</strong>
            </div>
            <div className="card-surface p-5 text-gray-600">
              <span>{isFrench ? 'Précision' : 'Accuracy'}</span>
              <strong className="mt-3 block text-[2rem] text-gray-900">94%</strong>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <UploadPanel
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              onFileChange={handleFileChange}
              onDownload={handleDownload}
              language={language}
            />

            <div className="card-surface p-4 text-gray-900" id="results">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{isFrench ? 'Résultats' : 'Results'}</h2>
              </div>

              <div className="card-surface p-5">
                <p className="text-[0.72rem] font-bold tracking-[0.06em] text-gray-600 uppercase">{isFrench ? 'Texte détecté' : 'Detected text'}</p>
                <h3 className="my-3 text-[1.3rem] font-bold text-gray-900">{isFrench ? '“Le manuscrit est compatible avec l’archive historique.”' : '“The manuscript matches the historical archive.”'}</h3>
                <ul className="list-disc pl-[1.1rem] leading-[1.8] text-gray-600">
                  <li>{isFrench ? 'Confiance élevée' : 'High confidence'}</li>
                  <li>{isFrench ? 'Zone d’intérêt : page 3' : 'Area of interest: page 3'}</li>
                  <li>{isFrench ? 'Analyse terminée' : 'Analysis complete'}</li>
                </ul>
              </div>
            </div>
          </div>
        </section> : (
          /* Les rubriques sont navigables, mais restent volontairement vides tant qu'elles ne sont pas développées. */
          <section className="flex min-h-[min(68vh,650px)] flex-col items-center justify-center p-8 text-center text-[#34436b]" aria-live="polite">
            <span className="mb-4 grid size-14 place-items-center rounded-full border border-indigo-200 bg-indigo-50 text-2xl text-ase-indigo" aria-hidden="true">✦</span>
            <p className="eyebrow text-indigo-500">{isFrench ? 'Espace de travail' : 'Workspace'}</p>
            <h1 className="mt-1.5 font-serif text-[clamp(1.8rem,4vw,2.6rem)] font-medium">{sectionTitles[activeSection]}</h1>
          </section>
        )}
      </main>
    </div>
  )
}
