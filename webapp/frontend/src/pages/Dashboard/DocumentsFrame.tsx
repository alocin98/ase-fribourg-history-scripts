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
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function DocumentsIcon() {
  return (
    <MenuGlyph>
      <path
        d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V6A1.5 1.5 0 0 1 7 4.5z"
        strokeLinejoin="round"
      />
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

function MenuEntry({
  to,
  label,
  icon,
  collapsed,
  end = false,
  className = '',
  onNavigate,
}: {
  to: string
  label: string
  icon: ReactNode
  collapsed: boolean
  end?: boolean
  className?: string
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      aria-label={label}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center rounded-lg font-sans text-[0.92rem] font-semibold no-underline ${collapsed ? 'size-10 justify-center' : 'gap-3 px-3 py-2'} ${isActive ? 'bg-[#f3f4fb] text-[#312e81]' : 'text-[#3d4663] hover:bg-[#f6f7fb]'} ${className}`
      }
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
  const [isMenuOpen, setIsMenuOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  const logoutFailed = Boolean((location.state as ShellLocationState | null)?.logoutFailed)

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener('ase-documents-changed', refresh)
    return () => window.removeEventListener('ase-documents-changed', refresh)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const closeOnPhone = () => {
      if (media.matches) setIsMenuOpen(false)
    }
    media.addEventListener('change', closeOnPhone)
    return () => media.removeEventListener('change', closeOnPhone)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setIsMenuOpen(false)
  }, [location.pathname])

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
      navigate(returnTo, {
        replace: true,
        state: { logoutFailed: true } satisfies ShellLocationState,
      })
    }
  }

  return (
    <DocumentsContext.Provider value={documents}>
      <div className="flex h-dvh flex-col overflow-hidden bg-[#f5f6fa] font-sans text-[#172033]">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-[#e6e8f2] bg-white px-3 py-3 sm:px-5">
          <Brand />
          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden items-center gap-1.5 md:flex">
              <LanguageSwitcher compact />
              <button
                type="button"
                className="inline-flex h-8 cursor-pointer items-center rounded-full border border-[#d9ddf5] bg-white px-2.5 font-sans text-[0.72rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  void handleLogout()
                }}
                disabled={isLeaving}
              >
                {t('nav.signOut')}
              </button>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#171c33] md:hidden"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span className="relative block h-3.5 w-5" aria-hidden="true">
                <span className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition ${isMenuOpen ? 'top-1.5 rotate-45' : 'top-0'}`} />
                <span className={`absolute top-1.5 left-0 h-0.5 w-5 rounded-full bg-current transition ${isMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition ${isMenuOpen ? 'top-1.5 -rotate-45' : 'top-3'}`} />
              </span>
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

        <div className="relative flex min-h-0 flex-1">
          {isMenuOpen && (
            <button
              type="button"
              className="absolute inset-0 z-10 cursor-pointer border-0 bg-[#171c33]/35 md:hidden"
              aria-label={t('nav.closeMenu')}
              onClick={() => setIsMenuOpen(false)}
            />
          )}
          <aside
            className={
              isMenuOpen
                ? 'relative z-20 flex w-[17.5rem] shrink-0 flex-col border-r border-[#e6e8f2] bg-white max-md:absolute max-md:inset-x-0 max-md:top-0 max-md:max-h-[min(24rem,70dvh)] max-md:w-full max-md:overflow-auto max-md:border-r-0 max-md:border-b max-md:shadow-[0_16px_40px_rgba(23,28,51,0.12)]'
                : 'relative hidden w-16 shrink-0 flex-col border-r border-[#e6e8f2] bg-white md:flex'
            }
          >
            <div
              className={`hidden shrink-0 md:flex ${isMenuOpen ? 'justify-end px-2 pt-2' : 'justify-center pt-3'}`}
            >
              <button
                type="button"
                className="grid size-9 cursor-pointer place-items-center rounded-full bg-white text-[#171c33] shadow-[0_4px_14px_rgba(23,28,51,0.16)] hover:shadow-[0_6px_18px_rgba(23,28,51,0.22)]"
                aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((open) => !open)}
              >
                <svg
                  className={`size-5 ${isMenuOpen ? '' : 'rotate-180'}`}
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  aria-hidden="true"
                >
                  <path
                    d="M12.5 4.5 L7 10 L12.5 15.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <nav
              className={`flex min-h-0 flex-1 overflow-auto ${isMenuOpen ? 'flex-col px-3 py-3 md:pb-4 md:pt-1' : 'flex-col items-center gap-1 px-2 pb-3 pt-2'}`}
              aria-label={t('nav.main')}
            >
              <MenuEntry
                to="/app/documents"
                label={t('documents.nav')}
                icon={<DocumentsIcon />}
                collapsed={!isMenuOpen}
                end
                onNavigate={() => {
                  if (window.matchMedia('(max-width: 767px)').matches) setIsMenuOpen(false)
                }}
              />
              <MenuEntry
                to="/app/profile"
                label={t('profile.nav')}
                icon={<ProfileIcon />}
                collapsed={!isMenuOpen}
                className={isMenuOpen ? 'md:mt-auto md:border-t md:border-[#eef0f6] md:pt-3' : 'mt-auto'}
                onNavigate={() => {
                  if (window.matchMedia('(max-width: 767px)').matches) setIsMenuOpen(false)
                }}
              />
              {isMenuOpen && (
                <div className="mt-3 flex flex-col items-start gap-3 border-t border-[#eef0f6] px-1 pt-3 md:hidden">
                  <LanguageSwitcher compact />
                  <button
                    type="button"
                    className="inline-flex h-8 cursor-pointer items-center rounded-full border border-[#d9ddf5] bg-white px-2.5 font-sans text-[0.72rem] font-bold text-[#4338a8] hover:bg-[#4f46e5] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleLogout()
                    }}
                    disabled={isLeaving}
                  >
                    {t('nav.signOut')}
                  </button>
                </div>
              )}
            </nav>
          </aside>

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </DocumentsContext.Provider>
  )
}
