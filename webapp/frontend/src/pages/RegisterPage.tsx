// Import des outils nécessaires au formulaire d'inscription et à la navigation.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ErrorKey } from '../i18n'

import Header from '../components/Header'
import { ApiError, register } from '../api/auth'

// Page d'inscription de l'application.
export default function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<ErrorKey | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Valide les informations saisies avant de créer le compte.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const { name, email, password, confirmPassword } = formData

    if (!name || !email || !password || !confirmPassword) {
      setError('errors.requiredFields')
      return
    }

    if (password !== confirmPassword) {
      setError('errors.passwordMismatch')
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
        setError('errors.emailTaken')
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
        <h1>{t('register.title')}</h1>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            {t('register.name')}
            <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />
          </label>

          <label>
            {t('register.email')}
            <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />
          </label>

          <label>
            {t('register.password')}
            <input type="password" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} />
          </label>

          <label>
            {t('register.confirmPassword')}
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
            />
          </label>

          {error && <p className="form-error">{t(error)}</p>}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? t('register.submitting') : t('register.submit')}
          </button>
        </form>

        <p className="muted">
          {t('register.hasAccount')} <Link to="/login">{t('register.login')}</Link>
        </p>
      </main>
    </div>
  )
}
