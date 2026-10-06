import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { listDocuments, listHiddenDocuments, listLocalDocuments, type StoredDocument } from '../../api/documents'
import { useAuth } from '../../auth/AuthProvider'
import Brand from '../../components/Brand'
import LanguageSwitcher from '../../components/LanguageSwitcher'

type ShellLocationState = { logoutFailed?: boolean }

export type MenuDocument = { id: string; label: string; description: string; editable: boolean }

const DocumentsContext = createContext<MenuDocument[] | null>(null)

export function useDocuments(): MenuDocument[] | null {
  return useContext(DocumentsContext)
}

const rowClass = 'block rounded-lg px-3 py-2 font-sans text-[0.92rem] font-semibold text-[#3d4663] no-underline hover:bg-[#f6f7fb]'
const rowActiveClass = 'block rounded-lg bg-[#f3f4fb] px-3 py-2 font-sans text-[0.92rem] font-semibold text-[#312e81] no-underline'

// Le logo et les actions sont sur la même ligne. Le menu reste à gauche, la page à droite.
export default function DocumentsFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [documents, setDocuments] = useState<MenuDocument[] | null>(null)
  const [revision, setRevision] = useState(0)
  const [isLeaving, setIsLeaving] = useState(false)
  const logoutFailed = Boolean((location.state as ShellLocationState | null)?.logoutFailed)

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener('ase-documents-changed', refresh)
    return () => window.removeEventListener('ase-documents-changed', refresh)
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const local = listLocalDocuments(user.id)
    const hidden = new Set(listHiddenDocuments(user.id))
    const linked = new Set(local.flatMap((item) => item.uploadId ? [item.uploadId] : []))
    listDocuments()
      .then((remote: StoredDocument[]) => {
        if (cancelled) return
        setDocuments([
          ...local.map((item) => ({ id: item.id, label: item.title, description: item.description, editable: true })),
          ...remote
            .filter((item) => !linked.has(item.id) && !hidden.has(item.id))
            .map((item) => ({ id: item.id, label: item.original_filename, description: '', editable: false })),
        ])
      })
      .catch(() => {
        if (!cancelled) setDocuments(local.map((item) => ({ id: item.id, label: item.title, description: item.description, editable: true })))
      })
    return () => {
      cancelled = true
    }
  }, [user, location.pathname, revision])

  const handleLogout = async () => {
    const returnTo = `${location.pathname}${location.search}`
    setIsLeaving(true)
    navigate('/', { replace: true })
    try {
      await logout()
    } catch {
      setIsLeaving(false)
      navigate(returnTo, { replace: true, state: { logoutFailed: true } satisfies ShellLocationState })
    }
  }

  return (
    <DocumentsContext.Provider value={documents}>
    <div className="flex h-dvh flex-col overflow-hidden bg-[#f5f6fa] font-sans text-[#172033]">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#e6e8f2] bg-white px-5 py-3 max-[640px]:px-3">
        <Brand />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          <LanguageSwitcher compact />
          <button
            type="button"
            className="inline-flex h-8 cursor-pointer items-center rounded-full border border-[#d9ddf5] bg-white px-2.5 font-sans text-[0.72rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleLogout}
            disabled={isLeaving}
          >
            {t('nav.signOut')}
          </button>
        </div>
      </header>
      {logoutFailed && <p className="m-0 bg-white px-5 pb-2 text-right text-[0.85rem] text-[#dc2626]" role="alert">{t('errors.server')}</p>}

      <div className="flex min-h-0 flex-1 max-[800px]:flex-col">
        <aside className="flex w-[17.5rem] shrink-0 flex-col border-r border-[#e6e8f2] bg-white max-[800px]:max-h-[40vh] max-[800px]:w-full max-[800px]:overflow-auto max-[800px]:border-r-0 max-[800px]:border-b">
          <nav className="flex min-h-0 flex-1 flex-col overflow-auto px-3 py-4" aria-label={t('nav.main')}>
            <Link to="/" className={rowClass}>{t('nav.home')}</Link>
            <NavLink to="/app/documents" end className={({ isActive }) => `mt-1 ${isActive ? rowActiveClass : rowClass}`}>
              {t('documents.nav')}
            </NavLink>
            <NavLink to="/app/profile" className={({ isActive }) => `mt-auto border-t border-[#eef0f6] pt-3 ${isActive ? rowActiveClass : rowClass}`}>
              {t('profile.nav')}
            </NavLink>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
    </DocumentsContext.Provider>
  )
}
