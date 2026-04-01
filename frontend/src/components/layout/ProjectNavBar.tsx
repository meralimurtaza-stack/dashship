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
    <div
      className="px-6 flex items-center gap-5 bg-ds-bg shrink-0"
      style={{
        height: '42px',
        borderBottom: '0.5px solid rgba(0,0,0,0.06)',
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        <span className="font-mono text-[12px] font-medium text-ds-text truncate max-w-[180px]">
          {projectName}
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-ds-border-strong shrink-0" />

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
                relative px-5 text-[12px] font-medium uppercase transition-colors
                ${isActive
                  ? 'text-ds-text'
                  : isDisabled
                    ? 'text-ds-text-dim cursor-not-allowed'
                    : 'text-ds-text-dim hover:text-ds-text-muted'
                }
              `}
              style={{
                paddingTop: '11px',
                paddingBottom: '11px',
                letterSpacing: '0.04em',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {label}
              {isActive && (
                <div
                  className="absolute bottom-0 left-5 right-5 bg-ds-accent"
                  style={{
                    height: '2px',
                    borderRadius: '2px 2px 0 0',
                  }}
                />
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
