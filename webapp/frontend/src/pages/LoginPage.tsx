// Import des outils nécessaires pour gérer l'état du formulaire et la navigation.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError, login } from '../api/auth'

// Page de connexion de l'application.
export default function LoginPage() {
  // Le hook de navigation permet de rediriger vers la page d'accueil après connexion.
  const navigate = useNavigate()

  // Les champs du formulaire sont stockés dans l'état local du composant.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cette fonction vérifie les informations saisies puis les envoie au backend.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    // Vérification que tous les champs sont bien remplis.
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
      // Redirection vers l'espace de travail après la connexion.
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Email ou mot de passe incorrect.')
      } else if (err instanceof ApiError && err.status === 422) {
        setError('Veuillez saisir une adresse email valide.')
      } else {
        setError('Impossible de joindre le serveur. Réessayez plus tard.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Structure visuelle de la page de connexion.
  return (
    <div className="auth-page login-auth-page">
      <nav className="auth-nav" aria-label="Navigation d'authentification">
        <Link to="/" className="auth-nav-brand welcome-brand" aria-label="Manuscript AI, accueil">
          <span className="logo-circle">A</span>
          <span><strong>Manuscript AI</strong><small>Archives en mouvement</small></span>
        </Link>
        <div className="auth-nav-links">
          <button type="button" className="auth-home-button auth-home-nav-link" onClick={() => navigate('/')}>
            Accueil
          </button>
        </div>
      </nav>
      <div className="auth-layout">
        <div className="auth-intro">
          <div className="auth-intro-copy">
            <span className="eyebrow">Votre espace de recherche</span>
            <h1>Retrouvez le fil de vos documents.</h1>
            <p>
              Connectez-vous pour retrouver vos fichiers, consulter vos dernières
              analyses et continuer votre travail là où vous l'avez laissé.
            </p>
            <ul className="auth-feature-list">
              <li><span className="check-mark">✓</span> Retrouver vos documents</li>
              <li><span className="check-mark">✓</span> Consulter vos analyses</li>
              <li><span className="check-mark">✓</span> Télécharger vos résultats</li>
            </ul>
          </div>
          <div className="auth-note"><span>●</span> Espace sécurisé et personnel</div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-heading">
            <span className="eyebrow">Bon retour</span>
            <h2>Connexion</h2>
            <p>Entrez vos informations pour accéder à votre espace.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom@exemple.com"
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="primary-button full-width" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
          </form>

          <p className="auth-switch">
            Pas encore de compte ? <Link to="/register">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
