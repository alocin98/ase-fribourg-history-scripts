import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { getProfile, isAuthenticated, logout } from '../api/auth'

// Barre de navigation commune à toutes les pages.
export default function Header() {
  return (
    <header className="header">
      <Link to="/" className="brand" aria-label="Manuscript AI, accueil">
        <span className="logo-circle">A</span>
        <span>
          <strong>Manuscript AI</strong>
          <small>Archives en mouvement</small>
        </span>
      </Link>
      <nav className="header-nav">
        {isAuthenticated() ? (
          <ProfileMenu />
        ) : (
          <>
            <Link to="/register">Inscription</Link>
            <Link to="/login" className="button">Se connecter</Link>
          </>
        )}
      </nav>
    </header>
  )
}

// Menu déroulant du compte connecté : email, accès à l'espace et déconnexion.
function ProfileMenu() {
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
    <div className="profile" ref={menuRef}>
      <button
        type="button"
        className="profile-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="profile-initials">{initials || '?'}</span>
        <span className="profile-email">{email}</span>
        <span className="profile-caret" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="profile-menu" role="menu">
          <div className="profile-menu-info">
            {name && <strong>{name}</strong>}
            <span className="muted-small">{email}</span>
          </div>
          <Link to="/app" role="menuitem" onClick={() => setIsOpen(false)}>Dashboard</Link>
          <button type="button" role="menuitem" className="profile-logout" onClick={handleLogout}>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
