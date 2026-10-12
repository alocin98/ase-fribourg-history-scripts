import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { listDocuments, type StoredDocument } from '../../api/documents'
import { useAuth } from '../../auth/AuthProvider'
import Brand from '../../components/Brand'
import LanguageSwitcher from '../../components/LanguageSwitcher'

type ShellLocationState = { logoutFailed?: boolean }

const DocumentsContext = createContext<StoredDocument[] | null>(null)

export function useDocuments(): StoredDocument[] | null {
  return useContext(DocumentsContext)
}

function MenuGlyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      {children}
    </svg>
  )
}

function DocumentsIcon() {
  return (
    <MenuGlyph>
      <path d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V6A1.5 1.5 0 0 1 7 4.5z" strokeLinejoin="round" />
      <path d="M14 4.5V9h4.5" strokeLinejoin="round" />
    </MenuGlyph>
  )
}

function ProfileIcon() {
  return (
    <MenuGlyph>
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.2c1.2-2.6 3.5-3.7 6.5-3.7s5.3 1.1 6.5 3.7" strokeLinecap="round" />
    </MenuGlyph>
  )
}

function MenuEntry({ to, label, icon, collapsed, end = false, className = '' }: {
  to: string
  label: string
  icon: ReactNode
  collapsed: boolean
  end?: boolean
  className?: string
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      aria-label={label}
      className={({ isActive }) => `flex items-center rounded-lg font-sans text-[0.92rem] font-semibold no-underline ${collapsed ? 'size-10 justify-center' : 'gap-3 px-3 py-2'} ${isActive ? 'bg-[#f3f4fb] text-[#312e81]' : 'text-[#3d4663] hover:bg-[#f6f7fb]'} ${className}`}
    >
      {icon}
      {collapsed ? null : <span className="truncate">{label}</span>}
    </NavLink>
  )
}

// Le logo et les actions sont sur la même ligne. Le menu reste à gauche, la page à droite.
export default function DocumentsFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [documents, setDocuments] = useState<StoredDocument[] | null>(null)
  const [revision, setRevision] = useState(0)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(true)
  const menuWidthClass = isMenuOpen ? 'w-[17.5rem] max-[800px]:max-h-[40vh] max-[800px]:w-full' : 'w-16 max-[800px]:w-full'
  const logoutFailed = Boolean((location.state as ShellLocationState | null)?.logoutFailed)

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener('ase-documents-changed', refresh)
    return () => window.removeEventListener('ase-documents-changed', refresh)
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listDocuments()
      .then((items) => {
        if (!cancelled) setDocuments(items)
      })
      .catch(() => {
        if (!cancelled) setDocuments([])
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
        <aside className={`relative flex shrink-0 flex-col border-r border-[#e6e8f2] bg-white max-[800px]:overflow-auto max-[800px]:border-r-0 max-[800px]:border-b ${menuWidthClass} ${isMenuOpen ? '' : 'max-[800px]:flex-row max-[800px]:items-center'}`}>
          <div className={`flex shrink-0 ${isMenuOpen ? 'justify-end px-2 pt-2' : 'justify-center pt-3 max-[800px]:pt-0 max-[800px]:pl-2'}`}>
              <button
                type="button"
                className="grid size-9 cursor-pointer place-items-center rounded-full bg-white text-[#171c33] shadow-[0_4px_14px_rgba(23,28,51,0.16)] hover:shadow-[0_6px_18px_rgba(23,28,51,0.22)]"
                aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((open) => !open)}
              >
                <svg className={`size-5 ${isMenuOpen ? '' : 'rotate-180'}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
                  <path d="M12.5 4.5 L7 10 L12.5 15.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
          </div>
          <nav className={`flex min-h-0 flex-1 overflow-auto ${isMenuOpen ? 'flex-col px-3 pb-4 pt-1' : 'flex-col items-center gap-1 px-2 pb-3 pt-2 max-[800px]:flex-row max-[800px]:justify-center max-[800px]:px-2 max-[800px]:py-2'}`} aria-label={t('nav.main')}>
            <MenuEntry to="/app/documents" label={t('documents.nav')} icon={<DocumentsIcon />} collapsed={!isMenuOpen} end />
            <MenuEntry to="/app/profile" label={t('profile.nav')} icon={<ProfileIcon />} collapsed={!isMenuOpen} className={isMenuOpen ? 'mt-auto border-t border-[#eef0f6] pt-3' : 'mt-auto max-[800px]:mt-0'} />
          </nav>
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
    </DocumentsContext.Provider>
  )
}
