import type { FC } from 'react'

interface GenerateButtonProps {
  isGenerating: boolean
  disabled: boolean
  onClick: () => void
}

const GenerateButton: FC<GenerateButtonProps> = ({ isGenerating, disabled, onClick }) => {
  if (isGenerating) {
    return (
      <div
        className="flex items-center gap-3 bg-ds-accent text-white font-mono text-xs uppercase tracking-wide px-6 py-3"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
        Captain is building your dashboard...
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 bg-ds-accent text-white font-mono text-xs uppercase tracking-wide px-6 py-3 hover:bg-ds-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5"
        />
      </svg>
      Generate Dashboard
    </button>
  )
}

export default GenerateButton
