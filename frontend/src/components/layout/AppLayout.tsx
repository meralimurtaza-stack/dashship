import { useState, useCallback, type FC } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import ProjectsPage from '../../pages/ProjectsPage'
import DataPage from '../../pages/DataPage'
import ChatPage from '../../pages/ChatPage'
import DashboardPage from '../../pages/DashboardPage'
import type { GeneratedDashboard } from '../../lib/generate-api'

const AppLayout: FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeNav, setActiveNav] = useState('Projects')

  // Shared dashboard state between Chat and Dashboards pages
  const [generatedDashboard, setGeneratedDashboard] = useState<GeneratedDashboard | null>(null)
  const [dashboardData, setDashboardData] = useState<Record<string, unknown>[]>([])

  const handleDashboardGenerated = useCallback(
    (dashboard: GeneratedDashboard, data: Record<string, unknown>[]) => {
      setGeneratedDashboard(dashboard)
      setDashboardData(data)
      setActiveNav('Dashboards')
    },
    []
  )

  const handleBackToChat = useCallback(() => {
    setActiveNav('Chat')
  }, [])

  const renderPage = () => {
    switch (activeNav) {
      case 'Projects':
        return <ProjectsPage />
      case 'Data':
        return <DataPage />
      case 'Chat':
        return <ChatPage onDashboardGenerated={handleDashboardGenerated} />
      case 'Dashboards':
        return (
          <DashboardPage
            dashboard={generatedDashboard}
            data={dashboardData}
            onBackToChat={handleBackToChat}
          />
        )
      default:
        return (
          <div className="max-w-2xl mx-auto px-6 py-20">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              {activeNav}
            </p>
            <h1 className="font-mono text-3xl font-semibold text-ink leading-tight mt-4">
              Coming soon.
            </h1>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-page">
      <Header
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        activeNav={activeNav}
        onNavChange={setActiveNav}
      />
      <div className="flex">
        <Sidebar collapsed={sidebarCollapsed} activeNav={activeNav} />
        <main className="flex-1 overflow-auto h-[calc(100vh-3.5rem)]">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
