import { useState, useRef, useEffect, type FC } from 'react'

interface HeaderProps {
  onToggleSidebar: () => void
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>
  onNavigate?: (page: string) => void
}

const DashShipLogo: FC = () => (
  <div className="flex items-center gap-2 shrink-0">
    <img src="/Logos/dashship-helm-logo.svg" alt="DashShip" className="w-[22px] h-[22px] shrink-0" />
    <span className="font-mono font-medium text-[14px] text-ds-text">
      DashShip_
    </span>
  </div>
)

const Header: FC<HeaderProps> = ({ onToggleSidebar, breadcrumbs, onNavigate }) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  return (
    <header className="h-14 border-b border-ds-border bg-ds-surface flex items-center justify-between px-5 sticky top-0 z-30">
      {/* Left: hamburger + logo + breadcrumbs */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1 hover:opacity-60 transition-opacity shrink-0"
          aria-label="Toggle sidebar"
        >
          <svg
            className="w-[18px] h-[18px] text-ds-text"
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

        <button
          onClick={() => onNavigate?.('Home')}
          className="hover:opacity-70 transition-opacity shrink-0"
        >
          <DashShipLogo />
        </button>

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 min-w-0">
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <span className="text-ds-text-dim text-xs shrink-0">/</span>
                {crumb.onClick ? (
                  <button
                    onClick={crumb.onClick}
                    className="font-mono text-xs text-ds-text-muted hover:text-ds-text transition-colors truncate max-w-[160px]"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="font-mono text-xs text-ds-text font-medium truncate max-w-[160px]">
                    {crumb.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: nav links + avatar */}
      <div className="flex items-center gap-5">
        <nav className="flex items-center gap-4">
          <span className="font-sans text-xs text-ds-text-muted cursor-pointer hover:text-ds-text transition-colors">Product</span>
          <span className="font-sans text-xs text-ds-text-muted cursor-pointer hover:text-ds-text transition-colors">Pricing</span>
          <span className="font-sans text-xs text-ds-text-muted cursor-pointer hover:text-ds-text transition-colors">Docs</span>
        </nav>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="w-7 h-7 border border-ds-border-strong flex items-center justify-center hover:border-ds-accent transition-colors"
          >
            <span className="font-mono text-[10px] font-medium text-ds-text-muted">
              U
            </span>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-ds-surface border border-ds-border py-1 animate-fadeIn z-50">
              <button
                onClick={() => { onNavigate?.('Settings'); setShowMenu(false) }}
                className="w-full text-left px-4 py-2 font-mono text-xs text-ds-text-muted hover:bg-ds-surface-alt hover:text-ds-text transition-colors"
              >
                Settings
              </button>
              <button
                className="w-full text-left px-4 py-2 font-mono text-xs text-ds-text-muted hover:bg-ds-surface-alt hover:text-ds-text transition-colors"
              >
                API Keys
              </button>
              <div className="border-t border-ds-border my-1" />
              <button
                className="w-full text-left px-4 py-2 font-mono text-xs text-ds-text-dim hover:bg-ds-surface-alt hover:text-ds-text transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
