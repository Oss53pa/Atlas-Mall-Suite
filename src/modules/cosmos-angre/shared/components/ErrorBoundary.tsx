// ═══ ErrorBoundary — Capture les erreurs React dans les volumes ═══

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
          <AlertTriangle size={40} className="text-amber-500" />
          <h2 className="text-lg font-display font-bold text-white">
            {this.props.fallbackTitle ?? 'Une erreur est survenue'}
          </h2>
          <p className="text-sm text-slate-400 max-w-md">
            {this.state.error?.message ?? 'Erreur inattendue. Veuillez reessayer.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="btn-primary mt-2"
          >
            <RefreshCw size={14} />
            Reessayer
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
