import type { FC } from 'react'

interface SidebarProps {
  collapsed: boolean
  activeNav: string
}

const sidebarConfig: Record<string, Array<{ label: string; count: number }>> = {
  Projects: [
    { label: 'All Projects', count: 0 },
    { label: 'Recent', count: 0 },
    { label: 'Shared', count: 0 },
  ],
  Data: [
    { label: 'All Sources', count: 0 },
    { label: 'Recent Uploads', count: 0 },
  ],
  Dashboards: [
    { label: 'Published', count: 0 },
    { label: 'Drafts', count: 0 },
  ],
  Settings: [
    { label: 'Account', count: 0 },
    { label: 'API Keys', count: 0 },
  ],
}

const Sidebar: FC<SidebarProps> = ({ collapsed, activeNav }) => {
  if (collapsed) {
    return (
      <aside className="w-0 overflow-hidden transition-all duration-200 ease-in-out shrink-0" />
    )
  }

  const items = sidebarConfig[activeNav] ?? sidebarConfig.Projects

  return (
    <aside className="w-56 h-[calc(100vh-3.5rem)] border-r border-gray-200 bg-white flex flex-col transition-all duration-200 ease-in-out shrink-0">
      {/* Section label */}
      <div className="px-5 pt-6 pb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          {activeNav}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3">
        {items.map((item, i) => (
          <button
            key={item.label}
            className={`w-full flex items-center justify-between px-3 py-2 transition-colors ${
              i === 0
                ? 'text-ink'
                : 'text-gray-400 hover:text-ink'
            }`}
          >
            <span className="font-mono text-xs uppercase tracking-wide">
              {item.label}
            </span>
            <span className="font-mono text-[10px] text-gray-300 tabular-nums">
              {item.count}
            </span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-5 border-t border-gray-200">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Free plan
        </p>
        <p className="font-mono text-[10px] text-gray-300 mt-1 tabular-nums">
          0 / 3 projects
        </p>
      </div>
    </aside>
  )
}

export default Sidebar
