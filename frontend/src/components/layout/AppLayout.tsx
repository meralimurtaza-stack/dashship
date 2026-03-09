import { useState, type FC } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import ProjectsPage from '../../pages/ProjectsPage'
import DataPage from '../../pages/DataPage'

const pages: Record<string, FC> = {
  Projects: ProjectsPage,
  Data: DataPage,
}

const AppLayout: FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeNav, setActiveNav] = useState('Projects')

  const PageComponent = pages[activeNav]

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
          {PageComponent ? <PageComponent /> : (
            <div className="max-w-2xl mx-auto px-6 py-20">
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                {activeNav}
              </p>
              <h1 className="font-mono text-3xl font-semibold text-ink leading-tight mt-4">
                Coming soon.
              </h1>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
