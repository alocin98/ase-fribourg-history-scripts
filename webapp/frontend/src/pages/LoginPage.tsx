// Import des outils nécessaires pour gérer l'état du formulaire et la navigation.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ErrorKey } from '../i18n'

import Header from '../components/Header'
import { ApiError, login } from '../api/auth'

// Page de connexion de l'application.
export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ErrorKey | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Vérifie les informations saisies puis les envoie au backend.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('errors.requiredFields')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('errors.invalidCredentials')
      } else if (err instanceof ApiError && err.status === 422) {
        setError('errors.invalidEmail')
      } else {
        setError('errors.server')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page">
      <Header />
      <main className="card">
        <h1>{t('login.title')}</h1>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            {t('login.email')}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label>
            {t('login.password')}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <p className="form-error">{t(error)}</p>}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <p className="muted">
          {t('login.noAccount')} <Link to="/register">{t('login.createAccount')}</Link>
        </p>
      </main>
    </div>
  )
}
