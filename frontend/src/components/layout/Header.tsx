import type { FC } from 'react'

interface HeaderProps {
  onToggleSidebar: () => void
  activeNav: string
  onNavChange: (nav: string) => void
}

const navItems = ['Projects', 'Data', 'Chat', 'Dashboards', 'Settings']

const ShipLogo: FC = () => (
  <svg
    width="26"
    height="24"
    viewBox="0 0 26 24"
    fill="none"
    className="shrink-0"
  >
    <path
      d="M2 18 L6 20 Q13 22, 20 20 L24 18 L22 16 L4 16 Z"
      fill="currentColor"
    />
    <rect x="11" y="4" width="2" height="12" fill="currentColor" />
    <path d="M13 4 L13 14 L22 14 Z" fill="currentColor" opacity="0.75" />
    <path d="M13 4 L13 2 L17 3 L13 4" fill="currentColor" />
  </svg>
)

const Header: FC<HeaderProps> = ({ onToggleSidebar, activeNav, onNavChange }) => {
  return (
    <header className="h-14 border-b border-gray-200 bg-white/95 backdrop-blur-md flex items-center justify-between px-5 sticky top-0 z-30">
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-1 hover:opacity-60 transition-opacity"
          aria-label="Toggle sidebar"
        >
          <svg
            className="w-[18px] h-[18px] text-ink"
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

        <div className="flex items-center gap-2 text-ink">
          <ShipLogo />
          <span className="font-mono font-semibold text-sm tracking-tight">
            DashShip
          </span>
        </div>
      </div>

      {/* Center: pill navigation */}
      <nav className="hidden md:flex items-center bg-gray-100 rounded-full p-1">
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => onNavChange(item)}
            className={`px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-all ${
              activeNav === item
                ? 'bg-gray-900 text-white rounded-full'
                : 'text-gray-500 hover:text-gray-900 rounded-full'
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Right: avatar */}
      <div className="flex items-center">
        <button className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors">
          <span className="font-mono text-[10px] font-medium text-gray-600">
            U
          </span>
        </button>
      </div>
    </header>
  )
}

export default Header
