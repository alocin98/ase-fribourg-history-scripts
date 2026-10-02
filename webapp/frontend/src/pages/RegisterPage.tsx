// Import des outils nécessaires au formulaire d'inscription et à la navigation.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ErrorKey } from '../i18n'

import AuthFrame from '../components/AuthFrame'
import { ApiError } from '../api/client'
import { register } from '../api/auth'

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
      navigate('/app/documents')
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
    <AuthFrame title={t('register.title')}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('register.name')}
          <input className="form-input" type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('register.email')}
          <input className="form-input" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('register.password')}
          <input className="form-input" type="password" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('register.confirmPassword')}
          <input className="form-input"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-red-700">{t(error)}</p>}

        <button type="submit" className="btn mt-2" disabled={isSubmitting}>
          {isSubmitting ? t('register.submitting') : t('register.submit')}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {t('register.hasAccount')} <Link to="/app/login" className="font-medium text-accent underline underline-offset-2">{t('register.login')}</Link>
      </p>
    </AuthFrame>
  )
}
