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
import { ChatProvider } from '../../contexts/ChatContext'
import { useToast } from '../ui/Toast'
import { type DashboardRecord } from '../../lib/dashboard-storage'
import type { GeneratedDashboard } from '../../lib/generate-api'
import type { ColumnSchema } from '../../types/datasource'
import type { ChatMessage, ChatDataContext } from '../../types/chat'
import type { CalculatedField } from '../../engine/formulaParser'

interface DashboardContext {
  dashboardId?: string
  dashboard: GeneratedDashboard
  data: Record<string, unknown>[]
  columns: ColumnSchema[]
  dataContext: ChatDataContext | null
  chatMessages: ChatMessage[]
  calculatedFields: CalculatedField[]
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

  const { currentProject, setCurrentProject, projects, refreshProjects, renameProject } = useProject()
  const { success } = useToast()

  const showSidebar = projects.length > 0

  // ── Derived chat context from current project ─────────────────

  const currentDataSourceId = currentProject?.dataSource?.id ?? null

  const currentDataContext: ChatDataContext | null = useMemo(() => {
    const ds = currentProject?.dataSource
    if (!ds?.schema) return null
    return {
      sourceId: ds.id,
      sourceName: ds.name,
      rowCount: ds.schema.rowCount,
      columns: ds.schema.columns
        .filter((c) => !c.hidden)
        .map((c) => ({
          name: c.name,
          displayName: c.displayName || null,
          type: c.type,
          role: c.role,
          sampleValues: c.sampleValues,
        })),
    }
  }, [currentProject])

  // ── Project naming from AI ────────────────────────────────────

  const handleProjectNamed = useCallback((name: string) => {
    setPendingProjectName(name)
    if (currentProject) {
      renameProject(currentProject.id, name)
    }
  }, [currentProject, renameProject])

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

  const handleChatStarted = useCallback((message: string, projectName: string | null) => {
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

  const handleSidebarSelectDashboard = useCallback((draft: DashboardRecord) => {
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
      dataContext: draft.dataContext || null,
      chatMessages: draft.chatMessages || [],
      calculatedFields: draft.calculatedFields || [],
    })
    setActivePage('Dashboards')
  }, [])

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
      setDashCtx({ dashboardId, dashboard, data, columns, dataContext, chatMessages, calculatedFields: [] })
      setActivePage('Dashboards')
      refreshProjects()
      success('Dashboard generated successfully')
    },
    [success, refreshProjects]
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
      dataContext: draft.dataContext || null,
      chatMessages: draft.chatMessages || [],
      calculatedFields: draft.calculatedFields || [],
    })
    setActivePage('Dashboards')
  }, [])

  const handleBackToChat = useCallback(() => {
    setActivePage('Chat')
  }, [])

  const handleStartPlanning = useCallback(() => {
    setActivePage('Chat')
  }, [])

  const handlePublished = useCallback(() => {
    refreshProjects()
  }, [refreshProjects])

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
            calculatedFields={dashCtx.calculatedFields}
            onBackToChat={handleBackToChat}
            onPublished={handlePublished}
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
            onSelectDashboard={handleSidebarSelectDashboard}
            onGoHome={goHome}
          />
        )}
        <main className={`flex-1 overflow-auto ${showProjectNav ? 'h-[calc(100vh-3.5rem-2.75rem)]' : 'h-[calc(100vh-3.5rem)]'}`}>
          <ChatProvider
            dataContext={currentDataContext}
            dataSourceId={currentDataSourceId}
            onProjectNamed={handleProjectNamed}
          >
            <PageTransition pageKey={activePage}>
              {renderPage()}
            </PageTransition>
          </ChatProvider>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
