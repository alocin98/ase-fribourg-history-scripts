import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import manuscriptPage from '../assets/gillion-de-trazegnies-1464.jpg'
import { isAuthenticated } from '../api/auth'
import LanguageSwitcher from '../components/LanguageSwitcher'

// Page publique de présentation du projet.
export default function WelcomePage() {
  const { t } = useTranslation()
  const signedIn = isAuthenticated()

  const steps = [
    { title: t('front.steps.upload.title'), text: t('front.steps.upload.text'), pending: true },
    { title: t('front.steps.read.title'), text: t('front.steps.read.text'), pending: true },
    { title: t('front.steps.transcribe.title'), text: t('front.steps.transcribe.text'), pending: true },
  ]

  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5 md:px-8">
        <span className="font-bold tracking-tight">Manuscript AI</span>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {signedIn ? (
            <Link to="/app/documents" className="btn">{t('front.openApp')}</Link>
          ) : (
            <Link to="/app/login" className="btn-quiet">{t('front.signIn')}</Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 md:px-8">
        <section className="grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:py-20">
          <div>
            <h1 className="max-w-[16ch] text-4xl leading-tight font-bold tracking-tight md:text-5xl">{t('front.title')}</h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">{t('front.intro')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {signedIn ? (
                <Link to="/app/documents" className="btn">{t('front.openApp')}</Link>
              ) : (
                <>
                  <Link to="/app/register" className="btn">{t('front.createAccount')}</Link>
                  <Link to="/app/login" className="btn-quiet">{t('front.signIn')}</Link>
                </>
              )}
            </div>
          </div>

          <ReaderPreview />
        </section>

        <section className="border-t border-line py-12 md:py-16">
          <h2 className="text-xl font-bold">{t('front.stepsTitle')}</h2>
          <ol className="mt-6 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <p className="text-sm text-muted tabular-nums">{index + 1}.</p>
                <h3 className="mt-1 font-bold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
                {step.pending && <p className="mt-2 text-sm text-accent">{t('front.inDevelopment')}</p>}
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted md:px-8">{t('front.footer')}</p>
      </footer>
    </div>
  )
}

// Aperçu du lecteur : une vraie page de manuscrit sur la scène sombre.
// Les cadres montrent ce que la reconnaissance repère sur la page.
// Positions en % de l'image, mesurées sur l'original (1302 × 2000 px).
function ReaderPreview() {
  const { t } = useTranslation()

  return (
    <figure>
      <div className="flex items-center justify-center rounded-md bg-stage px-5 py-7 sm:px-8">
        <div className="relative w-full max-w-[17rem]">
          <img
            src={manuscriptPage}
            width={781}
            height={1200}
            alt={t('front.preview.alt')}
            className="block h-auto w-full"
          />
          <span className="absolute rounded-sm border-2 border-blue bg-blue/10" style={{ left: '8.6%', top: '55.3%', width: '68.7%', height: '3%' }} aria-hidden="true">
            <span className={`${tagClass} bottom-full left-0 mb-1 bg-blue`}>{t('front.preview.line', { number: 6 })}</span>
          </span>
          <span className="absolute rounded-sm border-2 border-violet bg-violet/10" style={{ left: '46.4%', top: '79.9%', width: '16.1%', height: '15%' }} aria-hidden="true">
            <span className={`${tagClass} bottom-full left-0 mb-1 bg-violet`}>{t('front.preview.cannon')}</span>
          </span>
        </div>
      </div>
      <figcaption className="mt-2 text-sm text-muted">{t('front.preview.caption')}</figcaption>
    </figure>
  )
}

const tagClass = 'absolute rounded-sm px-1.5 py-0.5 text-[0.7rem] font-bold whitespace-nowrap text-white'
