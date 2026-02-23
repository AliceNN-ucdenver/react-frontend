import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Class-based error boundary that catches render errors.
 * Never exposes stack traces or component names in production (OWASP A04).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Only log to console in development — never expose to UI
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Something went wrong.</h2>
            <p>Please try again.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
