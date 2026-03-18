/**
 * AppLayout.tsx — Rewritten for new context architecture
 *
 * What changed:
 * - Uses AuthContext for anonymous sign-in on first action
 * - Uses new ProjectContext (createProject, selectProject, clearProject)
 * - ChatProvider receives activePhase instead of dataSourceId
 * - Removed all the derived dataContext/dataSourceId logic (now in ChatContext)
 * - Removed onProjectNamed callback chain (project naming handled by ProjectContext)
 * - Navigation still uses useState (React Router comes later)
 *
 * What's kept:
 * - dashCtx state for EditorPage (dashboard context is a later rebuild)
 * - pendingFile / pendingMessage for passing data between pages
 * - Sidebar, Header, ProjectNavBar, PageTransition components (unchanged)
 *
 * Spec references: §4 (customer journey), §10 (state management)
 */

import { useState, useCallback, useMemo, type FC } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import ProjectNavBar, { type NavTab } from './ProjectNavBar'
import PageTransition from './PageTransition'
import Home from '../../pages/Home'
import DataPage from '../../pages/DataPage'
import ChatPage from '../../pages/ChatPage'
import BuildPage from '../../pages/BuildPage'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import { ChatProvider } from '../../contexts/ChatContext'
import { useToast } from '../ui/Toast'
import type { GeneratedDashboard } from '../../lib/generate-api'
import type { ColumnSchema } from '../../types/datasource'
import type { ChatMessage, ChatDataContext, ConversationPhase } from '../../types/chat'
import type { CalculatedField } from '../../engine/formulaParser'

// ─── Types ────────────────────────────────────────────────────────

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

// ─── Layout ──────────────────────────────────────────────────────

const AppLayout: FC = () => {
  const { user, signInAnonymously } = useAuth()
  const {
    currentProject,
    projects,
    loading: projectsLoading,
    createProject,
    selectProject,
    clearProject,
    loadProjects,
  } = useProject()
  const { success } = useToast()

  // ── Local UI state ────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [activePage, setActivePage] = useState<AppPage>('Home')
  const [dashCtx, setDashCtx] = useState<DashboardContext | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  const showSidebar = projects.length > 0

  // ── Ensure user exists (anonymous sign-in if needed) ──────────
  // Every action that creates data needs a user.id.
  // This is called before createProject.

  const ensureUser = useCallback(async () => {
    if (user) return
    const { error } = await signInAnonymously()
    if (error) {
      console.error('Anonymous sign-in failed:', error.message)
      throw error
    }
    // Small delay to let auth state propagate
    await new Promise(resolve => setTimeout(resolve, 100))
  }, [user, signInAnonymously])

  // ── Map active page to conversation phase ─────────────────────
  // ChatProvider needs this to load the right conversation

  const activePhase: ConversationPhase = useMemo(() => {
    switch (activePage) {
      case 'Data': return 'data'
      case 'Chat': return 'plan'
      case 'Dashboards': return 'build'
      default: return 'plan'
    }
  }, [activePage])

  // ── Project nav ───────────────────────────────────────────────

  const showProjectNav = activePage !== 'Home' && activePage !== 'Settings' && currentProject

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
      case 'Data': setActivePage('Data'); break
      case 'Plan': setActivePage('Chat'); break
      case 'Build': setActivePage('Dashboards'); break
      case 'Publish': setActivePage('Dashboards'); break
    }
  }, [])

  // ── Breadcrumbs ───────────────────────────────────────────────

  const breadcrumbs = useMemo(() => {
    if (activePage === 'Home') return []
    const crumbs: Array<{ label: string; onClick?: () => void }> = []

    if (currentProject) {
      crumbs.push({ label: currentProject.name })
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
  }, [activePage, currentProject])

  // ── Go home ───────────────────────────────────────────────────

  const goHome = useCallback(() => {
    setActivePage('Home')
    clearProject()
    setDashCtx(null)
    setPendingFile(null)
    setPendingMessage(null)
  }, [clearProject])

  const handleNavigate = useCallback((page: string) => {
    if (page === 'Home') goHome()
    else if (page === 'Settings') setActivePage('Settings')
  }, [goHome])

  // ── Home page actions ─────────────────────────────────────────
  // Each action: ensure user → create project → navigate

  const handleFileUploaded = useCallback(async (file: File) => {
    try {
      await ensureUser()
      const name = file.name.replace(/\.[^.]+$/, '')
      await createProject({ name })
      setPendingFile(file)
      setPendingMessage(null)
      setSidebarCollapsed(false)
      setActivePage('Data')
    } catch (err) {
      console.error('Failed to start from file:', err)
    }
  }, [ensureUser, createProject])

  const handleChatStarted = useCallback(async (message: string) => {
    try {
      await ensureUser()
      await createProject({ fromPrompt: message })
      setPendingMessage(message)
      setPendingFile(null)
      setSidebarCollapsed(false)
      setActivePage('Chat')
    } catch (err) {
      console.error('Failed to start from chat:', err)
    }
  }, [ensureUser, createProject])

  const handleSampleSelected = useCallback(async (sampleKey: string, sampleName: string) => {
    try {
      await ensureUser()
      await createProject({ name: sampleName })
      setPendingMessage(null)
      setSidebarCollapsed(false)

      const sampleFiles: Record<string, string> = {
        sales: '/samples/sales-data.csv',
        hr: '/samples/hr-data.csv',
        ecommerce: '/samples/ecommerce-data.csv',
      }

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
    }
  }, [ensureUser, createProject])

  // ── Project selection (sidebar / home) ────────────────────────

  const handleProjectSelected = useCallback(async (projectId: string) => {
    try {
      await selectProject(projectId)
      setSidebarCollapsed(false)
      setPendingFile(null)
      setPendingMessage(null)
      setActivePage('Chat')
    } catch (err) {
      console.error('Failed to select project:', err)
    }
  }, [selectProject])

  // ── Dashboard generation callback ─────────────────────────────
  // Pages call this when a dashboard is generated.
  // This will be replaced by proper dashboard context later.

  const handleDashboardGenerated = useCallback(
    (
      dashboard: GeneratedDashboard,
      data: Record<string, unknown>[],
      columns: ColumnSchema[],
      dataContext: ChatDataContext | null,
      chatMessages: ChatMessage[],
      dashboardId?: string
    ) => {
      setDashCtx({
        dashboardId,
        dashboard,
        data,
        columns,
        dataContext,
        chatMessages,
        calculatedFields: [],
      })
      setActivePage('Dashboards')
      loadProjects()
      success('Dashboard generated successfully')
    },
    [success, loadProjects]
  )

  const handleBackToChat = useCallback(() => setActivePage('Chat'), [])
  const handleStartPlanning = useCallback(() => setActivePage('Chat'), [])
  const handlePublished = useCallback(() => loadProjects(), [loadProjects])

  // ── Render page ───────────────────────────────────────────────

  const renderPage = () => {
    switch (activePage) {
      case 'Home':
        return (
          <Home
            onFileUploaded={handleFileUploaded}
            onChatStarted={handleChatStarted}
            onSampleSelected={handleSampleSelected}
            onProjectSelected={handleProjectSelected}
          />
        )
      case 'Data':
        return (
          <DataPage
            initialFile={pendingFile}
            onStartPlanning={handleStartPlanning}
          />
        )
      case 'Chat':
        return (
          <ChatPage
            onDashboardGenerated={handleDashboardGenerated}
            initialMessage={pendingMessage}
            onDataUploaded={(file: File) => {
              setPendingFile(file)
              setActivePage('Data')
            }}
          />
        )
      case 'Dashboards':
        if (!dashCtx) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-md text-center space-y-4 px-6">
                <p className="micro-label">Dashboards</p>
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
          <BuildPage
            dashboard={dashCtx.dashboard}
            data={dashCtx.data}
            columns={dashCtx.columns}
            calculatedFields={dashCtx.calculatedFields}
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
        onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
        breadcrumbs={breadcrumbs}
        onNavigate={handleNavigate}
      />
      {showProjectNav && (
        <ProjectNavBar
          projectName={currentProject!.name}
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
            onSelectProject={handleProjectSelected}
            onGoHome={goHome}
          />
        )}
        <main
          className={`flex-1 overflow-auto ${
            showProjectNav
              ? 'h-[calc(100vh-3.5rem-2.75rem)]'
              : 'h-[calc(100vh-3.5rem)]'
          }`}
        >
          <ChatProvider activePhase={activePhase}>
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
