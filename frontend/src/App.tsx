import type { FC } from 'react'
import AppLayout from './components/layout/AppLayout'

const App: FC = () => {
  return (
    <AppLayout>
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
          Projects
        </h1>
        <p className="text-sm text-surface-500 mt-1">
          Upload data, chat with AI, and generate production-ready dashboards.
        </p>

        {/* Empty state */}
        <div className="mt-8 glass-card p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-primary-500"
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
          <h2 className="text-lg font-semibold text-surface-800">
            No projects yet
          </h2>
          <p className="text-sm text-surface-500 mt-1 max-w-sm">
            Create your first project to start building dashboards from your data.
          </p>
          <button className="mt-6 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
            New Project
          </button>
        </div>
      </div>
    </AppLayout>
  )
}

export default App
