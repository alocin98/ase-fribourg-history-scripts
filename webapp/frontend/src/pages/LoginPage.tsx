// Import des outils nécessaires pour gérer l'état du formulaire et la navigation.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ErrorKey } from '../i18n'

import AuthFrame from '../components/AuthFrame'
import { ApiError } from '../api/client'
import { login } from '../api/auth'

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
      navigate('/app/documents')
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
    <AuthFrame title={t('login.title')}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('login.email')}
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('login.password')}
          <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {error && <p className="text-sm text-red-700">{t(error)}</p>}

        <button type="submit" className="btn mt-2" disabled={isSubmitting}>
          {isSubmitting ? t('login.submitting') : t('login.submit')}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {t('login.noAccount')} <Link to="/app/register" className="font-medium text-accent underline underline-offset-2">{t('login.createAccount')}</Link>
      </p>
    </AuthFrame>
  )
}
