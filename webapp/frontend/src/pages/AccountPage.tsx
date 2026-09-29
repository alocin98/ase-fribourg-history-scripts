import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Header from '../components/Header'

// Espace connecté : menu latéral et contenu de la rubrique active.
export default function AccountPage() {
  const { t } = useTranslation()

  return (
    <div className="page">
      <Header />
      <div className="app-layout">
        <aside className="sidenav">
          <nav className="sidenav-menu">
            <NavLink to="/app" end>{t('account.dashboard')}</NavLink>
            <NavLink to="/app/documents">{t('account.documents')}</NavLink>
          </nav>
        </aside>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
