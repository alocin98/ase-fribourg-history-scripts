import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getProfile, logout } from '../api/auth'
import LanguageSwitcher from './LanguageSwitcher'

// Cadre des pages connectées : navigation à gauche, contenu à droite.
export default function AppLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const profile = getProfile()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="flex shrink-0 items-center gap-4 border-b border-line bg-white px-4 py-3 md:w-56 md:flex-col md:items-stretch md:border-r md:border-b-0 md:px-4 md:py-5">
        <Link to="/" className="font-bold tracking-tight" aria-label={t('nav.homeLabel')}>
          Manuscript AI
        </Link>

        <nav className="flex-1 md:mt-6">
          <NavLink
            to="/app/documents"
            className="block rounded px-2 py-1.5 text-sm text-muted hover:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium aria-[current=page]:text-accent"
          >
            {t('nav.documents')}
          </NavLink>
        </nav>

        <div className="flex items-center gap-3 md:flex-col md:items-stretch md:gap-3 md:border-t md:border-line md:pt-4">
          {profile && (
            <div className="hidden min-w-0 text-sm md:block">
              <p className="truncate font-medium">{profile.name}</p>
              <p className="truncate text-muted">{profile.email}</p>
            </div>
          )}
          <LanguageSwitcher />
          <button type="button" className="text-left text-sm text-muted underline-offset-2 hover:text-ink hover:underline" onClick={handleLogout}>
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
