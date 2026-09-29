import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getProfile, isAuthenticated, logout } from '../api/auth'
import LanguageSwitcher from './LanguageSwitcher'

// Barre de navigation commune à toutes les pages.
export default function Header() {
  const { t } = useTranslation()

  return (
    <header className="header">
      <Link to="/" className="brand" aria-label={t('header.homeLabel')}>
        <span className="brand-logo">A</span>
        <span>
          <strong>Manuscript AI</strong>
          <small>{t('header.tagline')}</small>
        </span>
      </Link>
      <nav className="header-nav">
        <LanguageSwitcher />
        {isAuthenticated() ? (
          <ProfileMenu />
        ) : (
          <>
            <Link to="/register">{t('header.register')}</Link>
            <Link to="/login" className="button">{t('header.login')}</Link>
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
    <div className="account" ref={menuRef}>
      <button
        type="button"
        className="account-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="account-initials">{initials || '?'}</span>
        <span className="account-email">{email}</span>
        <span className="account-caret" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="account-menu" role="menu">
          <div className="account-menu-info">
            {name && <strong>{name}</strong>}
            <span className="muted-small">{email}</span>
          </div>
          <Link to="/dashboard" role="menuitem" onClick={() => setIsOpen(false)}>{t('header.dashboard')}</Link>
          <button type="button" role="menuitem" className="account-logout" onClick={handleLogout}>
            {t('header.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
