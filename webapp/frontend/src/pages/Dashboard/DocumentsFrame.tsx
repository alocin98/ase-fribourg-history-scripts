import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  listDocuments,
  listSharedDocuments,
  type StoredDocument,
} from '../../api/documents'
import { useAuth } from '../../auth/AuthProvider'
import Brand from '../../components/Brand'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import TranscriptionSearch from './TranscriptionSearch'

type ShellLocationState = { logoutFailed?: boolean }

type DocumentsLists = {
  owned: StoredDocument[] | null
  shared: StoredDocument[] | null
}

const DocumentsContext = createContext<DocumentsLists>({ owned: null, shared: null })

export function useDocuments(): DocumentsLists {
  return useContext(DocumentsContext)
}

export default function DocumentsFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [owned, setOwned] = useState<StoredDocument[] | null>(null)
  const [shared, setShared] = useState<StoredDocument[] | null>(null)
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
    Promise.all([
      listDocuments().catch(() => [] as StoredDocument[]),
      listSharedDocuments().catch(() => [] as StoredDocument[]),
    ]).then(([ownedItems, sharedItems]) => {
      if (cancelled) return
      setOwned(ownedItems)
      setShared(sharedItems)
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
      navigate(returnTo, {
        replace: true,
        state: { logoutFailed: true } satisfies ShellLocationState,
      })
    }
  }

  return (
    <DocumentsContext.Provider value={{ owned, shared }}>
      <div className="flex h-dvh flex-col overflow-hidden bg-[#f5f6fa] font-sans text-[#172033]">
        <header className="relative flex min-h-16 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#e6e8f2] bg-white px-5 py-3 max-[640px]:px-3">
          <Brand />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-center px-4 min-[720px]:flex">
            <div className="pointer-events-auto w-full max-w-[17.25rem]">
              <TranscriptionSearch />
            </div>
          </div>
          <div className="w-full min-w-0 min-[720px]:hidden">
            <TranscriptionSearch />
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <nav className="flex items-center" aria-label={t('nav.main')}>
              <NavLink
                to="/app/documents"
                end
                className={({ isActive }) =>
                  `px-2 py-1.5 font-sans text-[0.88rem] font-semibold underline decoration-[#c7d2fe] underline-offset-[4px] ${
                    isActive
                      ? 'text-[#312e81] decoration-[#4338a8]'
                      : 'text-[#3d4663] hover:text-[#312e81] hover:decoration-[#4338a8]'
                  }`
                }
              >
                {t('documents.nav')}
              </NavLink>
            </nav>
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
        {logoutFailed && (
          <p
            className="m-0 bg-white px-5 pb-2 text-right text-[0.85rem] text-[#dc2626]"
            role="alert"
          >
            {t('errors.server')}
          </p>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </DocumentsContext.Provider>
  )
}
