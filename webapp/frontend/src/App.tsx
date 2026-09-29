// Import des modules nécessaires pour la navigation entre les pages.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

// Import des pages principales de l'application.
import WelcomePage from './pages/WelcomePage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { isAuthenticated } from './api/auth'

// Import des fichiers de style : base commune, puis accueil et tableau de bord.
import './App.css'
import './manuscript.css'

// Protège le tableau de bord et redirige les visiteurs non connectés.
function ProtectedDashboard() {
  return isAuthenticated() ? <HomePage /> : <Navigate to="/login" replace />
}

// Composant principal de l'application.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// Export du composant principal pour l'application.
export default App
