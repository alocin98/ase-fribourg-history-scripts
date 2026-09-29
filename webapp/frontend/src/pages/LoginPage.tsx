// Import des outils nécessaires pour gérer l'état du formulaire et la navigation.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Header from '../components/Header'
import { ApiError, login } from '../api/auth'

// Page de connexion de l'application.
export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Vérifie les informations saisies puis les envoie au backend.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
      navigate('/app')
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

  return (
    <div className="page">
      <Header />
      <main className="card">
        <p className="kicker">Bon retour</p>
        <h1>Connexion</h1>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label>
            Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="muted">
          Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </p>
      </main>
    </div>
  )
}
