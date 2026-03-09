import type { FC } from 'react'

interface HeaderProps {
  onToggleSidebar: () => void
}

const Header: FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
    <header className="h-14 border-b border-surface-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg
            className="w-5 h-5 text-surface-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
            />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">D</span>
          </div>
          <span className="text-sm font-semibold text-surface-900 tracking-tight">
            DashShip
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-xs font-medium text-primary-700">U</span>
        </div>
      </div>
    </header>
  )
}

export default Header
