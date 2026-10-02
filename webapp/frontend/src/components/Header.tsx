import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getProfile, isAuthenticated, logout } from '../api/auth'
import LanguageSwitcher from './LanguageSwitcher'

// Barre de navigation commune à toutes les pages.
export default function Header() {
  const { t } = useTranslation()

  return (
    <header className="flex items-center justify-between border-b border-ase-line py-5">
      <Link to="/" className="flex items-center gap-2.5" aria-label={t('header.homeLabel')}>
        <span className="logo-mark">A</span>
        <span>
          <strong className="block text-[0.95rem] tracking-[0.02em]">Manuscript AI</strong>
          <small className="mt-0.5 block text-[0.65rem] text-ase-muted max-sm:hidden">{t('header.tagline')}</small>
        </span>
      </Link>
      <nav className="flex items-center gap-5 text-[0.85rem]">
        <LanguageSwitcher />
        {isAuthenticated() ? (
          <ProfileMenu />
        ) : (
          <>
            <Link to="/register" className="font-bold text-ase-muted hover:text-ase-ink">{t('header.register')}</Link>
            <Link to="/login" className="btn-primary">{t('header.login')}</Link>
          </>
        )}
      </nav>
    </header>
  )
}

// Menu déroulant du compte connecté : email, accès à l'espace et déconnexion.
function ProfileMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const profile = getProfile()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : ''
  const email = profile?.email ?? ''
  const initials = `${profile?.firstName.charAt(0) ?? ''}${profile?.lastName.charAt(0) || email.charAt(0)}`.toUpperCase()

  // Ferme le menu lors d'un clic à l'extérieur ou avec la touche Échap.
  useEffect(() => {
    if (!isOpen) return

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  // Déconnecte l'utilisateur et le ramène à l'accueil public.
  const handleLogout = () => {
    logout()
    setIsOpen(false)
    navigate('/')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="flex items-center gap-2.5 rounded-full border border-ase-line bg-white py-1.5 pr-2.5 pl-1.5 text-ase-ink transition hover:border-indigo-200 hover:shadow-[0_6px_16px_rgb(79_70_229/0.12)] aria-expanded:border-indigo-200 aria-expanded:shadow-[0_6px_16px_rgb(79_70_229/0.12)]"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="grid size-[30px] place-items-center rounded-full bg-ase-gradient text-xs font-extrabold text-white">{initials || '?'}</span>
        <span className="text-[0.8rem] font-semibold max-sm:hidden">{email}</span>
        <span className="text-[0.7rem] text-ase-muted" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+0.5rem)] right-0 z-10 flex min-w-60 flex-col rounded-xl border border-ase-line bg-white p-1.5 shadow-[0_18px_40px_rgb(23_32_51/0.12)]" role="menu">
          <div className="mb-1 flex flex-col gap-0.5 border-b border-ase-line px-3 pt-2.5 pb-3">
            {name && <strong>{name}</strong>}
            <span className="text-xs text-ase-muted">{email}</span>
          </div>
          <Link to="/dashboard" role="menuitem" className="rounded-lg px-3 py-2.5 text-[0.85rem] text-[#59627d] hover:bg-[#f1f0ff] hover:text-indigo-800" onClick={() => setIsOpen(false)}>{t('header.dashboard')}</Link>
          <button type="button" role="menuitem" className="rounded-lg px-3 py-2.5 text-left text-[0.85rem] text-red-600 hover:bg-red-50" onClick={handleLogout}>
            {t('header.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
