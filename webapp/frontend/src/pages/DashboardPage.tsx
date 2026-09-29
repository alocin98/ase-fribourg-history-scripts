import { useTranslation } from 'react-i18next'

import { getProfile } from '../api/auth'

// Rubrique Dashboard : message d'information uniquement pour l'instant.
export default function DashboardPage() {
  const { t } = useTranslation()
  const profile = getProfile()

  return (
    <>
      <h1>{t('dashboard.title')}</h1>
      <p className="info">
        {profile?.firstName ? t('dashboard.welcomeName', { name: profile.firstName }) : t('dashboard.welcome')}
      </p>
    </>
  )
}
