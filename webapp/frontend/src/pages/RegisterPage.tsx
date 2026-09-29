// Import des outils nécessaires au formulaire d'inscription et à la navigation.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Header from '../components/Header'
import { ApiError, register } from '../api/auth'

// Page d'inscription de l'application.
export default function RegisterPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Valide les informations saisies avant de créer le compte.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const { name, email, password, confirmPassword } = formData

    if (!name || !email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs.')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      // Crée le compte sur le backend puis connecte directement l'utilisateur.
      await register(name.trim(), email.trim(), password)
      navigate('/app')
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

  return (
    <div className="page">
      <Header />
      <main className="card">
        <p className="kicker">Commencer simplement</p>
        <h1>Créer un compte</h1>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Nom complet
            <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />
          </label>

          <label>
            Email
            <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />
          </label>

          <label>
            Mot de passe
            <input type="password" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} />
          </label>

          <label>
            Confirmer le mot de passe
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Création…' : 'S’inscrire'}
          </button>
        </form>

        <p className="muted">
          Vous avez déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </main>
    </div>
  )
}
