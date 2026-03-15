import type { FC } from 'react'
import AppLayout from './components/layout/AppLayout'
import { ToastProvider } from './components/ui/Toast'
import { ProjectProvider } from './contexts/ProjectContext'

const App: FC = () => {
  return (
    <ToastProvider>
      <ProjectProvider>
        <AppLayout />
      </ProjectProvider>
    </ToastProvider>
  )
}

export default App
