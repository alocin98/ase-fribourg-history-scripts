import { NavLink, Outlet } from 'react-router-dom'

import Header from '../components/Header'

// Espace connecté : menu latéral et contenu de la rubrique active.
export default function AccountPage() {
  return (
    <div className="page">
      <Header />
      <div className="app-layout">
        <aside className="sidenav">
          <nav className="sidenav-menu">
            <NavLink to="/app" end>Dashboard</NavLink>
            <NavLink to="/app/documents">Documents</NavLink>
          </nav>
        </aside>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
