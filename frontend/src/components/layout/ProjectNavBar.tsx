import { type FC } from 'react'

type NavTab = 'Data' | 'Plan' | 'Build' | 'Publish'

interface ProjectNavBarProps {
  projectName: string
  activeTab: NavTab
  onNavigate: (tab: NavTab) => void
  hasDashboard?: boolean
}

const TABS: Array<{ key: NavTab; label: string }> = [
  { key: 'Data', label: 'DATA' },
  { key: 'Plan', label: 'PLAN' },
  { key: 'Build', label: 'BUILD' },
  { key: 'Publish', label: 'PUBLISH' },
]

const ProjectNavBar: FC<ProjectNavBarProps> = ({
  projectName,
  activeTab,
  onNavigate,
  hasDashboard,
}) => {
  return (
    <div className="h-11 px-5 flex items-center gap-5 border-b border-ds-border bg-ds-surface shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        <span className="font-mono text-xs font-medium text-ds-text truncate max-w-[180px]">
          {projectName}
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-ds-border shrink-0" />

      {/* Underline tabs */}
      <div className="flex items-center gap-0">
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key
          const isDisabled = (key === 'Build' || key === 'Publish') && !hasDashboard

          return (
            <button
              key={key}
              onClick={() => !isDisabled && onNavigate(key)}
              disabled={isDisabled}
              className={`
                relative px-4 py-2.5 font-mono text-xs transition-colors
                ${isActive
                  ? 'text-ds-text font-medium'
                  : isDisabled
                    ? 'text-ds-text-dim cursor-not-allowed'
                    : 'text-ds-text-muted hover:text-ds-text'
                }
              `}
            >
              {label}
              {isActive && (
                <div className="absolute bottom-0 left-4 right-4 h-[2.5px] bg-ds-accent" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type { NavTab }
export default ProjectNavBar
