// Import des modules nécessaires pour la navigation entre les pages.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

// Import des pages principales de l'application.
import LandingPage from './pages/LandingPage'
import AccountPage from './pages/AccountPage'
import DashboardPage from './pages/DashboardPage'
import DocumentsPage from './pages/DocumentsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { isAuthenticated } from './api/auth'

// Import du fichier de style principal.
import './App.css'

// Protège la page du compte et redirige les visiteurs non connectés.
function ProtectedAccount() {
  return isAuthenticated() ? <AccountPage /> : <Navigate to="/login" replace />
}

// Composant principal de l'application.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/app" element={<ProtectedAccount />}>
          <Route index element={<DashboardPage />} />
          <Route path="documents" element={<DocumentsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// Export du composant principal pour l'application.
export default App
