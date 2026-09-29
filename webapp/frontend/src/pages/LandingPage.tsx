import { Link } from 'react-router-dom'

import Header from '../components/Header'
import { isAuthenticated } from '../api/auth'

// Page d'accueil publique du projet.
export default function LandingPage() {
  return (
    <div className="page">
      <Header />
      <main className="landing">
        <h1>Donnez une nouvelle lecture aux manuscrits historiques</h1>
        <p>Reconnaître, analyser et comprendre des documents historiques grâce à l'intelligence artificielle.</p>
        <div className="actions">
          {isAuthenticated() ? (
            <Link to="/app" className="button">Mon compte</Link>
          ) : (
            <>
              <Link to="/register" className="button">Créer un compte</Link>
              <Link to="/login" className="button button-secondary">Se connecter</Link>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
