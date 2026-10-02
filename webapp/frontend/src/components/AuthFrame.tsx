import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import LanguageSwitcher from './LanguageSwitcher'

// Cadre commun aux pages de connexion et d'inscription.
export default function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col px-4">
      <header className="mx-auto flex w-full max-w-sm items-center justify-between py-6">
        <Link to="/" className="font-bold tracking-tight">Manuscript AI</Link>
        <LanguageSwitcher />
      </header>
      <main className="mx-auto mt-[8vh] w-full max-w-sm rounded-md border border-line bg-white p-6 sm:p-8">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </main>
    </div>
  )
}
