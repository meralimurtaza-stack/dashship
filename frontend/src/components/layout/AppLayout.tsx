import { useState, useCallback, type FC } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import ProjectsPage from '../../pages/ProjectsPage'
import DataPage from '../../pages/DataPage'
import ChatPage from '../../pages/ChatPage'
import EditorPage from '../../pages/EditorPage'
import type { GeneratedDashboard } from '../../lib/generate-api'
import type { ColumnSchema } from '../../types/datasource'
import type { ChatMessage, ChatDataContext } from '../../types/chat'

interface DashboardContext {
  dashboard: GeneratedDashboard
  data: Record<string, unknown>[]
  columns: ColumnSchema[]
  dataContext: ChatDataContext | null
  chatMessages: ChatMessage[]
}

const AppLayout: FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeNav, setActiveNav] = useState('Projects')

  const [dashCtx, setDashCtx] = useState<DashboardContext | null>(null)

  const handleDashboardGenerated = useCallback(
    (
      dashboard: GeneratedDashboard,
      data: Record<string, unknown>[],
      columns: ColumnSchema[],
      dataContext: ChatDataContext | null,
      chatMessages: ChatMessage[]
    ) => {
      setDashCtx({ dashboard, data, columns, dataContext, chatMessages })
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
        if (!dashCtx) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-md text-center space-y-4 px-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                  Dashboards
                </p>
                <h2 className="font-mono text-2xl font-semibold text-ink leading-tight">
                  No dashboard yet.
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Chat with Captain to plan your analysis, then generate a dashboard.
                </p>
                <button
                  onClick={handleBackToChat}
                  className="inline-flex items-center gap-2 bg-gray-900 text-white font-mono text-xs uppercase tracking-wide px-6 py-3 hover:bg-gray-800 transition-colors mt-2"
                  style={{ borderRadius: 2 }}
                >
                  Start Planning
                </button>
              </div>
            </div>
          )
        }
        return (
          <EditorPage
            dashboard={dashCtx.dashboard}
            data={dashCtx.data}
            columns={dashCtx.columns}
            dataContext={dashCtx.dataContext}
            chatMessages={dashCtx.chatMessages}
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
