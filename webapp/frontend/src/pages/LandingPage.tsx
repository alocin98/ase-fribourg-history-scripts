import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Header from '../components/Header'
import { isAuthenticated } from '../api/auth'

// Page d'accueil publique du projet.
export default function LandingPage() {
  const { t } = useTranslation()

  return (
    <div className="page">
      <Header />
      <main className="landing">
        <h1>{t('landing.title')}</h1>
        <p>{t('landing.subtitle')}</p>
        <div className="actions">
          {isAuthenticated() ? (
            <Link to="/app" className="button">{t('landing.myAccount')}</Link>
          ) : (
            <>
              <Link to="/register" className="button">{t('landing.createAccount')}</Link>
              <Link to="/login" className="button button-secondary">{t('landing.login')}</Link>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
