import { useState, type FC, type ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

interface AppLayoutProps {
  children: ReactNode
}

const AppLayout: FC<AppLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeNav, setActiveNav] = useState('Projects')

  return (
    <div className="min-h-screen bg-page">
      <Header
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        activeNav={activeNav}
        onNavChange={setActiveNav}
      />
      <div className="flex">
        <Sidebar collapsed={sidebarCollapsed} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
