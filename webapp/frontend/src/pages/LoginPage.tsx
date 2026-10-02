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
    <div className="mx-auto max-w-[1120px] px-4">
      <Header />
      <main className="mx-auto my-12 max-w-[420px] rounded-2xl border border-ase-line bg-white p-9 shadow-[0_18px_40px_rgb(23_32_51/0.06)]">
        <h1 className="mb-6 font-serif text-[2rem] font-medium text-ase-ink">{t('login.title')}</h1>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5 text-[0.8rem] font-semibold">
            {t('login.email')}
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1.5 text-[0.8rem] font-semibold">
            {t('login.password')}
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <p className="text-[0.85rem] text-red-600">{t(error)}</p>}

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <p className="mt-6 text-[0.85rem] text-ase-muted">
          {t('login.noAccount')} <Link to="/register" className="font-semibold text-ase-indigo underline">{t('login.createAccount')}</Link>
        </p>
      </main>
    </div>
  )
}
