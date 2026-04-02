/**
 * AppLayout.tsx — Main layout with jsxCode-based dashboard context
 *
 * The dashboard pipeline now uses Claude-generated JSX rendered in an iframe,
 * replacing the old Sheet-based DashboardRenderer.
 */

import { useState, useCallback, useMemo, useEffect, type FC } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import ProjectNavBar, { type NavTab } from './ProjectNavBar'
import PageTransition from './PageTransition'
import GeneratingOverlay from '../dashboard/GeneratingOverlay'
import Home from '../../pages/Home'
import DataPage from '../../pages/DataPage'
import ChatPage from '../../pages/ChatPage'
import BuildPage from '../../pages/BuildPage'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import { ChatProvider } from '../../contexts/ChatContext'
import { useToast } from '../ui/Toast'
import { generateDashboardJsx, editDashboardJsx } from '../../lib/generate-api'
import { saveDashboard } from '../../lib/dashboard-storage'
import type { ChatMessage, ChatDataContext, ConversationPhase } from '../../types/chat'

// ─── Types ────────────────────────────────────────────────────────

interface DashboardContext {
  dashboardId?: string
  jsxCode: string
  dashboardName: string
  data: Record<string, unknown>[]
  dataContext: ChatDataContext | null
  chatMessages: ChatMessage[]
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
  const { success, error: showError } = useToast()

  // ── Local UI state ────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [activePage, setActivePage] = useState<AppPage>('Home')
  const [dashCtx, setDashCtx] = useState<DashboardContext | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [savedPlan, setSavedPlan] = useState<import('../../utils/plan-parser').PlanDelta | null>(null)

  const showSidebar = projects.length > 0

  // ── Auto-restore last project on return ─────────────────────
  // When user returns after closing the browser, auto-select their
  // most recent project so they pick up where they left off.

  useEffect(() => {
    if (projectsLoading || activePage !== 'Home' || currentProject) return
    if (projects.length === 0) return

    // Check if there's a saved last-project in localStorage
    const lastProjectId = localStorage.getItem('dashship_last_project')
    const target = lastProjectId
      ? projects.find(p => p.id === lastProjectId) ?? projects[0]
      : null

    if (target) {
      selectProject(target.id).then(() => {
        setSidebarCollapsed(false)
        setActivePage('Chat')
      }).catch(() => {
        // Project no longer accessible — stay on Home
      })
    }
  }, [projectsLoading, projects]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save current project ID to localStorage whenever it changes
  useEffect(() => {
    if (currentProject?.id) {
      localStorage.setItem('dashship_last_project', currentProject.id)
    }
  }, [currentProject?.id])

  // ── Auto-load saved dashboard when returning to a project ──────
  // If the user returns to a project that has a saved dashboard,
  // reload the JSX + data so they can continue editing.
  useEffect(() => {
    if (!currentProject?.id || dashCtx) return

    const loadSavedDashboard = async () => {
      try {
        const dashboards = await import('../../lib/dashboard-storage').then(m => m.listDashboards(currentProject.id))
        if (dashboards.length === 0 || !dashboards[0].jsxCode) return

        const latest = dashboards[0]
        // Also need to reload the data rows
        const sources = await import('../../lib/datasource-storage').then(m => m.listDataSources(currentProject.id))
        if (sources.length === 0) return

        const src = sources[0]
        let rows: Record<string, unknown>[] = []
        try {
          rows = await import('../../lib/datasource-storage').then(m => m.downloadDataSourceRows(src.filePath, src.fileName))
        } catch {
          console.warn('[AppLayout] Could not reload data rows for saved dashboard')
        }

        // Build dataContext from saved source
        const dataContext: ChatDataContext = {
          sourceId: src.id,
          sourceName: src.name,
          rowCount: src.schema.rowCount,
          filePath: src.filePath,
          fileName: src.fileName,
          columns: src.schema.columns
            .filter((c: { hidden?: boolean }) => !c.hidden)
            .map((c: { name: string; displayName?: string; type: string; role: string; sampleValues: string[] }) => ({
              name: c.name,
              displayName: c.displayName || null,
              type: c.type,
              role: c.role,
              sampleValues: c.sampleValues || [],
            })),
        }

        // Remap rows if there are display name renames
        const renameMap: Record<string, string> = {}
        for (const c of dataContext.columns) {
          if (c.displayName && c.displayName !== c.name) {
            renameMap[c.name] = c.displayName
          }
        }
        if (Object.keys(renameMap).length > 0) {
          rows = rows.map(row => {
            const newRow: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(row)) {
              newRow[renameMap[key] ?? key] = value
            }
            return newRow
          })
        }

        setDashCtx({
          dashboardId: latest.id,
          jsxCode: latest.jsxCode!,
          dashboardName: latest.name,
          data: rows,
          dataContext,
          chatMessages: [],
        })
        console.log('[AppLayout] Restored saved dashboard:', latest.name)
      } catch (err) {
        console.error('[AppLayout] Failed to load saved dashboard:', err)
      }
    }

    loadSavedDashboard()
  }, [currentProject?.id, dashCtx])

  // ── Ensure user exists (anonymous sign-in if needed) ──────────

  const ensureUser = useCallback(async () => {
    if (user) return
    const { error } = await signInAnonymously()
    if (error) {
      console.error('Anonymous sign-in failed:', error.message)
      throw error
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }, [user, signInAnonymously])

  // ── Map active page to conversation phase ─────────────────────

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
    if (currentProject) crumbs.push({ label: currentProject.name })
    const pageLabels: Record<string, string> = {
      Data: 'Data', Chat: 'Plan', Dashboards: 'Build', Settings: 'Settings',
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

  // ── Project selection ─────────────────────────────────────────

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
  // Now receives jsxCode instead of GeneratedDashboard

  const handleGeneratingStarted = useCallback(() => {
    setIsGenerating(true)
  }, [])

  const handleGeneratingFailed = useCallback(() => {
    setIsGenerating(false)
    // Stay on Chat page so user can see the error and try again
  }, [])

  const handleDashboardGenerated = useCallback(
    async (
      jsxCode: string,
      data: Record<string, unknown>[],
      dashboardName: string,
      dataContext: ChatDataContext | null,
      chatMessages: ChatMessage[],
      dashboardId?: string
    ) => {
      // Save JSX to dashboards table immediately
      let savedId = dashboardId
      if (currentProject?.id) {
        try {
          const saved = await saveDashboard({
            id: dashboardId,
            projectId: currentProject.id,
            name: dashboardName,
            jsxCode,
            status: 'draft',
          })
          savedId = saved.id
        } catch (err) {
          console.error('[AppLayout] Failed to save dashboard:', err)
        }
      }

      setDashCtx({
        dashboardId: savedId,
        jsxCode,
        dashboardName,
        data,
        dataContext,
        chatMessages,
      })
      setIsGenerating(false)
      setActivePage('Dashboards')
      loadProjects()
      success('Dashboard generated successfully')
    },
    [success, loadProjects, currentProject]
  )

  const handleBackToChat = useCallback(() => setActivePage('Chat'), [])
  const handleStartPlanning = useCallback(() => setActivePage('Chat'), [])
  const handlePublished = useCallback(() => loadProjects(), [loadProjects])

  // Edit: send current JSX + edit request for targeted changes
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [jsxHistory, setJsxHistory] = useState<string[]>([])

  const handleRegenerate = useCallback(async (buildMessages?: Array<{ role: string; content: string }>) => {
    if (!dashCtx || isRegenerating) return
    setIsRegenerating(true)
    try {
      // If we have build messages and current JSX, use the edit endpoint
      if (buildMessages && buildMessages.length > 0 && dashCtx.jsxCode) {
        // Save current JSX to history for undo
        setJsxHistory(prev => [...prev.slice(-4), dashCtx.jsxCode])

        // Extract the last user message as the edit request
        const lastUserMsg = [...buildMessages].reverse().find(m => m.role === 'user')
        if (!lastUserMsg) return

        const result = await editDashboardJsx(
          dashCtx.jsxCode,
          lastUserMsg.content,
          buildMessages.slice(-10)
        )
        setDashCtx(prev => prev ? { ...prev, jsxCode: result.jsxCode } : prev)
        // Persist edit to Supabase
        if (dashCtx.dashboardId && currentProject?.id) {
          saveDashboard({ id: dashCtx.dashboardId, projectId: currentProject.id, name: dashCtx.dashboardName, jsxCode: result.jsxCode }).catch(err => console.error('[AppLayout] Failed to save edit:', err))
        }
        success('Dashboard updated')
      } else {
        // Full regeneration (no build messages or no existing JSX)
        const planSummary = dashCtx.chatMessages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => `${m.role === 'user' ? 'User' : 'Captain'}: ${m.content}`)
          .join('\n\n')

        const result = await generateDashboardJsx(dashCtx.dataContext!, planSummary, undefined, dashCtx.data)
        setDashCtx(prev => prev ? { ...prev, jsxCode: result.jsxCode } : prev)
        // Persist regeneration to Supabase
        if (dashCtx.dashboardId && currentProject?.id) {
          saveDashboard({ id: dashCtx.dashboardId, projectId: currentProject.id, name: dashCtx.dashboardName, jsxCode: result.jsxCode }).catch(err => console.error('[AppLayout] Failed to save regen:', err))
        }
        success('Dashboard regenerated')
      }
    } catch (err) {
      console.error('[AppLayout] Edit/regeneration failed:', err)
      showError(`Dashboard update failed: ${(err as Error).message}`)
    } finally {
      setIsRegenerating(false)
    }
  }, [dashCtx, isRegenerating, success])

  const handleUndo = useCallback(() => {
    if (jsxHistory.length === 0) return
    const previous = jsxHistory[jsxHistory.length - 1]
    setJsxHistory(prev => prev.slice(0, -1))
    setDashCtx(prev => prev ? { ...prev, jsxCode: previous } : prev)
    success('Reverted to previous version')
  }, [jsxHistory, success])

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
            onGeneratingStarted={handleGeneratingStarted}
            onGeneratingFailed={handleGeneratingFailed}
            initialMessage={pendingMessage}
            savedPlan={savedPlan}
            onPlanChanged={setSavedPlan}
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
            jsxCode={dashCtx.jsxCode}
            data={dashCtx.data}
            dashboardName={dashCtx.dashboardName}
            dashboardId={dashCtx.dashboardId}
            projectId={currentProject?.id}
            onPublished={handlePublished}
            onRegenerate={handleRegenerate}
            isRegenerating={isRegenerating}
            onUndo={jsxHistory.length > 0 ? handleUndo : undefined}
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
    <div className="min-h-screen" style={{ backgroundColor: (activePage === 'Home' || activePage === 'Data' || activePage === 'Chat') ? 'var(--color-lp-surface)' : 'var(--color-ds-bg)' }}>
      {isGenerating && <GeneratingOverlay />}
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
