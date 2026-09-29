import { getProfile } from '../api/auth'

// Rubrique Dashboard : message d'information uniquement pour l'instant.
export default function DashboardPage() {
  const profile = getProfile()

  return (
    <>
      <h1>Dashboard</h1>
      <p className="info">
        Bienvenue{profile?.firstName ? `, ${profile.firstName}` : ''} ! Les fonctionnalités d'analyse
        de documents seront bientôt disponibles.
      </p>
    </>
  )
}
