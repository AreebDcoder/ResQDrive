import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — catches render errors in child tree and shows a friendly fallback.
 *
 * Without this, a single render bug crashes the whole app to a white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 * For per-route isolation, wrap each route's element:
 *   <ErrorBoundary><IncidentsPage /></ErrorBoundary>
 */

interface Props {
  children: ReactNode;
  /** Custom fallback UI. If not provided, default UI is shown. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Called when an error is caught — wire to your error logger. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center dark:bg-gray-950">
          <div className="text-danger-500" aria-hidden>
            <AlertTriangle size={56} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
            <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
              The application encountered an unexpected error. You can try again or refresh the page.
            </p>
            {this.state.error.message && (
              <pre className="mt-4 max-w-2xl overflow-auto rounded-lg bg-gray-900 p-4 text-left text-xs text-red-300">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <RefreshCw size={14} />
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
