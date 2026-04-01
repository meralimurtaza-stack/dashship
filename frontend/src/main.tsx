import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App'
import ViewerPage from './pages/ViewerPage'
import DockPage from './pages/DockPage'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/view/:slug" element={<ViewerPage />} />
        <Route path="/embed/:slug" element={<ViewerPage embed />} />
        <Route path="/dock/:slug/:dashboardSlug" element={<AuthProvider><DockPage /></AuthProvider>} />
        <Route path="/dock/:slug" element={<AuthProvider><DockPage /></AuthProvider>} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
