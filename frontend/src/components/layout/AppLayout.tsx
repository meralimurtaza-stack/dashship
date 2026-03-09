import { useState, type FC, type ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

interface AppLayoutProps {
  children: ReactNode
}

const AppLayout: FC<AppLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-surface-50">
      <Header onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)} />
      <div className="flex">
        <Sidebar collapsed={sidebarCollapsed} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
