import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { AuthProvider, useAuth } from './auth/AuthProvider'
import DocumentOverviewPage from './pages/Dashboard/DocumentOverviewPage'
import DocumentsPage from './pages/Dashboard/DocumentsPage'
import ProfilePage from './pages/Dashboard/ProfilePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import WelcomePage from './pages/WelcomePage'
import { AuthMotionLayout } from './pages/auth/useAuthTransition'

// Attend que la session soit connue, puis laisse passer ou redirige.
function SessionGate({ children, redirectTo }: { children: ReactNode; redirectTo?: string }) {
  const { ready } = useAuth()
  const { t } = useTranslation()
  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f5f6fa] font-sans text-[#5d657c]">
        {t('common.loading')}
      </div>
    )
  }
  if (redirectTo) return <Navigate to={redirectTo} replace />
  return children
}

// /app exige une session. Sinon, direction la connexion.
function RequireAuth() {
  const { user } = useAuth()
  return (
    <SessionGate redirectTo={user ? undefined : '/login'}>
      <Outlet />
    </SessionGate>
  )
}

// Connexion et inscription sont réservées aux visiteurs sans session.
function GuestOnly() {
  const { user } = useAuth()
  return (
    <SessionGate redirectTo={user ? '/app/documents' : undefined}>
      <Outlet />
    </SessionGate>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route element={<GuestOnly />}>
            <Route element={<AuthMotionLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<Navigate to="/app/documents" replace />} />
            <Route path="/app/documents" element={<DocumentsPage />} />
            <Route path="/app/profile" element={<ProfilePage />} />
            <Route path="/app/documents/:documentId/overview" element={<DocumentOverviewPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
