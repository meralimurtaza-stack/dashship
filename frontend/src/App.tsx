import type { FC } from 'react'
import AppLayout from './components/layout/AppLayout'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './contexts/AuthContext'
import { ProjectProvider } from './contexts/ProjectContext'

const App: FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <ProjectProvider>
          <AppLayout />
        </ProjectProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App