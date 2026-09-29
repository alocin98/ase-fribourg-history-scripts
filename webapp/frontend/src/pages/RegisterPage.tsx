// Import des outils nécessaires au formulaire d'inscription et à la navigation.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError, register } from '../api/auth'

// Page d'inscription de l'application.
export default function RegisterPage() {
  // Le hook de navigation permet de diriger l'utilisateur après l'inscription.
  const navigate = useNavigate()

  // Les informations du formulaire sont gérées dans un seul objet d'état.
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  // Le message d'erreur est affiché si certaines validations ne sont pas respectées.
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cette fonction met à jour les champs au fur et à mesure que l'utilisateur tape.
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Cette fonction valide les informations saisies avant de créer le compte.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const { name, email, password, confirmPassword } = formData

    // Vérification que tous les champs sont remplis.
    if (!name || !email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs.')
      return
    }

    // Vérification que les deux mots de passe correspondent.
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      // Crée le compte sur le backend puis connecte directement l'utilisateur.
      await register(name.trim(), email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Un compte existe déjà avec cette adresse email.')
      } else if (err instanceof ApiError && err.status === 422) {
        setError('Veuillez saisir une adresse email valide.')
      } else {
        setError('Impossible de joindre le serveur. Réessayez plus tard.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Structure visuelle de la page d'inscription.
  return (
    <div className="auth-page register-auth-page">
      <nav className="auth-nav" aria-label="Navigation d'authentification">
        <Link to="/" className="auth-nav-brand welcome-brand" aria-label="Manuscript AI, accueil">
          <span className="logo-circle">A</span>
          <span><strong>Manuscript AI</strong><small>Archives en mouvement</small></span>
        </Link>
        <div className="auth-nav-links">
          <Link to="/" className="auth-home-nav-link">Accueil</Link>
          <Link to="/login" className="auth-nav-action">Se connecter</Link>
        </div>
      </nav>
      <div className="auth-layout">
        <div className="auth-intro">
          <div className="auth-intro-copy">
            <span className="eyebrow">Votre nouveau départ</span>
            <h1>Un espace à vous pour chaque découverte.</h1>
            <p>
              Créez votre compte et transformez votre travail de recherche en un
              parcours clair, organisé et facile à reprendre.
            </p>
            <ul className="auth-feature-list register-benefits">
              <li><span className="check-mark">✓</span> Centraliser vos documents</li>
              <li><span className="check-mark">✓</span> Suivre vos analyses</li>
              <li><span className="check-mark">✓</span> Reprendre au bon endroit</li>
            </ul>
            <p className="register-list-note">Votre espace reste simple à retrouver, même après une pause.</p>
            <div className="register-book-icon" role="img" aria-label="Livre historique ouvert">
              <span className="book-cover book-cover-left" />
              <span className="book-cover book-cover-right" />
              <span className="book-page book-page-left" />
              <span className="book-page book-page-right" />
              <span className="book-spine" />
            </div>
          </div>
          <div className="auth-note"><span>✦</span> Un espace clair pour votre projet</div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-heading">
            <span className="eyebrow">Commencer simplement</span>
            <h2>Créer un compte</h2>
            <p>Quelques informations suffisent pour ouvrir votre espace.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Nom complet
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Votre nom"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="prenom@exemple.com"
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <label>
            Confirmer le mot de passe
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="primary-button full-width" disabled={isSubmitting}>
            {isSubmitting ? 'Création…' : 'S’inscrire'}
          </button>
          </form>

          <p className="auth-switch">
            Vous avez déjà un compte ? <Link to="/login">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
