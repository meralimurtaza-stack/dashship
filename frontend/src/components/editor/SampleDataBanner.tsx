import { type FC } from 'react'

interface SampleDataBannerProps {
  onUpload: () => void
  onDismiss: () => void
}

const SampleDataBanner: FC<SampleDataBannerProps> = ({ onUpload, onDismiss }) => (
  <div
    className="flex items-center justify-between px-4 py-2 border-b shrink-0"
    style={{ background: 'var(--color-ds-accent-glow)', borderColor: 'rgba(28,51,96,0.15)' }}
  >
    <p className="font-sans text-[11px] text-ds-accent">
      Showing sample data — upload your own CSV to see your real numbers here
    </p>
    <div className="flex items-center gap-3">
      <button
        onClick={onUpload}
        className="font-sans text-[11px] text-ds-accent underline hover:opacity-70 transition-opacity"
      >
        Upload &rarr;
      </button>
      <button
        onClick={onDismiss}
        className="text-ds-text-dim hover:text-ds-text transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
)

export default SampleDataBanner
