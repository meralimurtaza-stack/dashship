import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  name?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}]`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[120px] p-6">
          <p className="micro-label mb-2">
            {this.props.name ?? 'Component'} Error
          </p>
          <p className="font-mono text-sm text-ds-text-muted mb-4 text-center max-w-xs">
            Something went wrong rendering this {this.props.name?.toLowerCase() ?? 'section'}.
          </p>
          <button
            onClick={this.handleRetry}
            className="font-mono text-[10px] uppercase tracking-wide text-ds-text-muted border border-ds-border-strong px-4 py-1.5 hover:border-ds-accent hover:text-ds-text transition-colors"
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
