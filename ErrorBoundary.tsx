import * as React from 'react';
import { CrashReport } from './components/CrashReport';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch and display critical rendering errors.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Switched to a namespace import for React (`import * as React`) and using fully qualified
  // types like `React.Component`. This resolves potential type resolution issues in some build
  // environments where named imports might conflict, causing properties like 'state' and 'props'
  // to appear missing on the component class instance.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for diagnostic purposes.
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);

    // This will now correctly be recognized as a method on the component instance.
    this.setState({
      errorInfo: errorInfo,
    });
  }

  render() {
    // If an error was caught, render the technical crash report
    if (this.state.hasError) {
      return (
        <CrashReport 
          error={this.state.error || new Error("An unknown error occurred.")} 
          componentStack={this.state.errorInfo?.componentStack} 
        />
      );
    }

    // `this.props` is correctly accessed on a class component instance.
    return this.props.children;
  }
}
