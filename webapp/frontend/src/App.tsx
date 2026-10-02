// Import des modules nécessaires pour la navigation entre les pages.
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import AppLayout from './components/AppLayout'
import HomePage from './pages/HomePage'
import WelcomePage from './pages/WelcomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { isAuthenticated } from './api/auth'

// Redirige les visiteurs non connectés vers la page de connexion.
function RequireAuth() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/app/login" replace />
}

// Composant principal : la page publique sous /, l'application sous /app.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/app">
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="documents" replace />} />
              <Route path="documents" element={<HomePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/app/documents" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// Export du composant principal pour l'application.
export default App
