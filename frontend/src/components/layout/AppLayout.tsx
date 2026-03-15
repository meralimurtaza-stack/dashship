import { useState, useCallback, useMemo, type FC } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import ProjectNavBar, { type NavTab } from './ProjectNavBar'
import PageTransition from './PageTransition'
import Home from '../../pages/Home'
import DataPage from '../../pages/DataPage'
import ChatPage from '../../pages/ChatPage'
import EditorPage from '../../pages/EditorPage'
import { useProject, type Project } from '../../contexts/ProjectContext'
import { useToast } from '../ui/Toast'
import { type DashboardRecord } from '../../lib/dashboard-storage'
import type { GeneratedDashboard } from '../../lib/generate-api'
import type { ColumnSchema } from '../../types/datasource'
import type { ChatMessage, ChatDataContext } from '../../types/chat'

interface DashboardContext {
  dashboardId?: string
  dashboard: GeneratedDashboard
  data: Record<string, unknown>[]
  columns: ColumnSchema[]
  dataContext: ChatDataContext | null
  chatMessages: ChatMessage[]
}

type AppPage = 'Home' | 'Data' | 'Chat' | 'Dashboards' | 'Settings'

// ── Layout ───────────────────────────────────────────────────

const AppLayout: FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [activePage, setActivePage] = useState<AppPage>('Home')
  const [dashCtx, setDashCtx] = useState<DashboardContext | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [pendingProjectName, setPendingProjectName] = useState<string | null>(null)

  const { currentProject, setCurrentProject, projects } = useProject()
  const { success } = useToast()

  const showSidebar = projects.length > 0

  // ── Project Nav ──────────────────────────────────────────────

  const projectName = currentProject?.name || pendingProjectName || ''

  const showProjectNav = activePage !== 'Home' && activePage !== 'Settings' && projectName

  const activeNavTab: NavTab = useMemo(() => {
    switch (activePage) {
      case 'Data': return 'Data'
      case 'Chat': return 'Plan'
      case 'Dashboards': return 'Build'
      default: return 'Data'
    }
  }, [activePage])

  const handleNavTab = useCallback((tab: NavTab) => {
    switch (tab) {
      case 'Data':
        setActivePage('Data')
        break
      case 'Plan':
        setActivePage('Chat')
        break
      case 'Build':
        setActivePage('Dashboards')
        break
      case 'Publish':
        // Navigate to editor where publish lives
        setActivePage('Dashboards')
        break
    }
  }, [])

  // ── Breadcrumbs ────────────────────────────────────────────────

  const breadcrumbs = useMemo(() => {
    if (activePage === 'Home') return []
    const crumbs: Array<{ label: string; onClick?: () => void }> = []

    if (currentProject) {
      crumbs.push({ label: currentProject.name })
    } else if (pendingProjectName) {
      crumbs.push({ label: pendingProjectName })
    }

    const pageLabels: Record<string, string> = {
      Data: 'Data',
      Chat: 'Plan',
      Dashboards: 'Build',
      Settings: 'Settings',
    }

    if (activePage === 'Settings') return [{ label: 'Settings' }]
    if (pageLabels[activePage]) crumbs.push({ label: pageLabels[activePage] })

    return crumbs
  }, [activePage, currentProject, pendingProjectName])

  // ── Navigation ─────────────────────────────────────────────────

  const goHome = useCallback(() => {
    setActivePage('Home')
    setCurrentProject(null)
    setDashCtx(null)
    setPendingFile(null)
    setPendingMessage(null)
    setPendingProjectName(null)
  }, [setCurrentProject])

  const handleNavigate = useCallback((page: string) => {
    if (page === 'Home') goHome()
    else if (page === 'Settings') setActivePage('Settings')
  }, [goHome])

  // ── Home Actions ───────────────────────────────────────────────

  const handleFileUploaded = useCallback((file: File, projectName: string) => {
    setPendingProjectName(projectName)
    setPendingFile(file)
    setPendingMessage(null)
    setSidebarCollapsed(false)
    setActivePage('Data')
  }, [])

  const handleChatStarted = useCallback((message: string, projectName: string) => {
    setPendingProjectName(projectName)
    setPendingMessage(message)
    setPendingFile(null)
    setSidebarCollapsed(false)
    setActivePage('Chat')
  }, [])

  const handleSampleSelected = useCallback(async (sampleKey: string, projectName: string) => {
    setPendingProjectName(projectName)
    setPendingMessage(null)
    setSidebarCollapsed(false)

    const sampleFiles: Record<string, string> = {
      sales: '/samples/sales-data.csv',
      hr: '/samples/hr-data.csv',
      ecommerce: '/samples/ecommerce-data.csv',
    }
    try {
      const url = sampleFiles[sampleKey]
      if (url) {
        const resp = await fetch(url)
        const blob = await resp.blob()
        const file = new File([blob], `${sampleKey}-data.csv`, { type: 'text/csv' })
        setPendingFile(file)
        setActivePage('Data')
      }
    } catch (err) {
      console.error('Failed to load sample:', err)
      setActivePage('Chat')
    }
  }, [])

  const handleProjectSelected = useCallback((project: Project) => {
    setCurrentProject(project)
    setSidebarCollapsed(false)
    setPendingFile(null)
    setPendingMessage(null)
    setActivePage('Chat')
  }, [setCurrentProject])

  const handleSidebarSelectProject = useCallback((project: Project) => {
    setCurrentProject(project)
    setPendingFile(null)
    setPendingMessage(null)
    setActivePage('Chat')
  }, [setCurrentProject])

  // ── Dashboard ──────────────────────────────────────────────────

  const handleDashboardGenerated = useCallback(
    (
      dashboard: GeneratedDashboard,
      data: Record<string, unknown>[],
      columns: ColumnSchema[],
      dataContext: ChatDataContext | null,
      chatMessages: ChatMessage[],
      dashboardId?: string
    ) => {
      setDashCtx({ dashboardId, dashboard, data, columns, dataContext, chatMessages })
      setActivePage('Dashboards')
      success('Dashboard generated successfully')
    },
    [success]
  )

  const handleDraftSelected = useCallback(async (draft: DashboardRecord) => {
    const dashboard: GeneratedDashboard = {
      name: draft.name,
      sheets: draft.sheets,
      layout: draft.layout,
    }
    setDashCtx({
      dashboardId: draft.id,
      dashboard,
      data: draft.data,
      columns: [],
      dataContext: null,
      chatMessages: [],
    })
    setActivePage('Dashboards')
  }, [])

  const handleBackToChat = useCallback(() => {
    setActivePage('Chat')
  }, [])

  const handleStartPlanning = useCallback(() => {
    setActivePage('Chat')
  }, [])

  // ── Render ─────────────────────────────────────────────────────

  const renderPage = () => {
    switch (activePage) {
      case 'Home':
        return (
          <Home
            onFileUploaded={handleFileUploaded}
            onChatStarted={handleChatStarted}
            onSampleSelected={handleSampleSelected}
            onProjectSelected={handleProjectSelected}
            onDraftSelected={handleDraftSelected}
          />
        )
      case 'Data':
        return (
          <DataPage
            initialFile={pendingFile}
            onDashboardGenerated={handleDashboardGenerated}
            onStartPlanning={handleStartPlanning}
          />
        )
      case 'Chat':
        return (
          <ChatPage
            onDashboardGenerated={handleDashboardGenerated}
            initialMessage={pendingMessage}
          />
        )
      case 'Dashboards':
        if (!dashCtx) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-md text-center space-y-4 px-6">
                <p className="micro-label">
                  Dashboards
                </p>
                <h2 className="font-mono text-2xl font-medium text-ds-text leading-tight">
                  No dashboard yet.
                </h2>
                <p className="text-sm text-ds-text-muted leading-relaxed font-sans">
                  Chat with Captain to plan your analysis, then generate a dashboard.
                </p>
                <button
                  onClick={handleBackToChat}
                  className="inline-flex items-center gap-2 bg-ds-accent text-white font-mono text-xs uppercase tracking-wide px-6 py-3 hover:bg-ds-accent-hover transition-colors mt-2"
                >
                  Start Planning
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            </div>
          )
        }
        return (
          <EditorPage
            dashboardId={dashCtx.dashboardId}
            dashboard={dashCtx.dashboard}
            data={dashCtx.data}
            columns={dashCtx.columns}
            dataContext={dashCtx.dataContext}
            chatMessages={dashCtx.chatMessages}
            onBackToChat={handleBackToChat}
          />
        )
      case 'Settings':
        return (
          <div className="max-w-2xl mx-auto px-6 py-20">
            <p className="micro-label">Settings</p>
            <h1 className="font-mono text-3xl font-medium text-ds-text leading-tight mt-4">
              Coming soon.
            </h1>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-ds-bg">
      <Header
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        breadcrumbs={breadcrumbs}
        onNavigate={handleNavigate}
      />
      {showProjectNav && (
        <ProjectNavBar
          projectName={projectName}
          activeTab={activeNavTab}
          onNavigate={handleNavTab}
          hasDashboard={dashCtx !== null}
        />
      )}
      <div className="flex">
        {showSidebar && (
          <Sidebar
            collapsed={sidebarCollapsed}
            activeProjectId={currentProject?.id ?? null}
            onSelectProject={handleSidebarSelectProject}
            onGoHome={goHome}
          />
        )}
        <main className={`flex-1 overflow-auto ${showProjectNav ? 'h-[calc(100vh-3.5rem-2.75rem)]' : 'h-[calc(100vh-3.5rem)]'}`}>
          <PageTransition pageKey={activePage}>
            {renderPage()}
          </PageTransition>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
