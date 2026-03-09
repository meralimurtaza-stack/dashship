import type { FC } from 'react'
import AppLayout from './components/layout/AppLayout'

const App: FC = () => {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-6 py-20">
        {/* Editorial empty state */}
        <div className="space-y-16">
          {/* Heading block */}
          <div className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Projects
            </p>
            <h1 className="font-mono text-3xl font-semibold text-ink leading-tight">
              Nothing here yet.
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed max-w-md">
              Upload a dataset, describe what you need, and DashShip will
              generate a production-ready dashboard in seconds.
            </p>
          </div>

          {/* CTA card */}
          <div className="border border-gray-200 bg-white p-10">
            <div className="flex items-start gap-6">
              {/* Icon */}
              <div className="w-10 h-10 border border-gray-300 flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </div>

              {/* Text */}
              <div className="flex-1 space-y-3">
                <h2 className="font-mono text-xs uppercase tracking-widest text-ink">
                  Create your first project
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Start with a CSV, Excel file, or connect directly to your
                  database. Our AI will analyse your data and suggest the
                  right visualisations.
                </p>
                <button className="mt-2 bg-gray-900 text-white font-mono text-xs uppercase tracking-wide px-6 py-3 hover:bg-ink transition-colors">
                  New Project
                </button>
              </div>
            </div>
          </div>

          {/* Feature hints */}
          <div className="grid grid-cols-3 gap-px bg-gray-200">
            {[
              { label: 'Upload', desc: 'CSV, XLSX, or database' },
              { label: 'Chat', desc: 'Describe your analysis' },
              { label: 'Ship', desc: 'Publish to a hosted URL' },
            ].map((step) => (
              <div key={step.label} className="bg-page p-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                  {step.label}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default App
