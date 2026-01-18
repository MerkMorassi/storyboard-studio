// FIX: Switched to named imports from 'react' to ensure proper type resolution for class components.
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CrashReport } from './components/CrashReport';

interface ErrorBoundaryProps {
  // FIX: Use named import 'ReactNode' directly.
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  // FIX: Use named import 'ErrorInfo' directly.
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch and display critical rendering errors.
 */
// FIX: The `ErrorBoundary` class must extend `Component` to be a valid React class component. This provides access to `this.props` and `this.setState`, resolving the errors.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  // FIX: Use named import 'ErrorInfo' directly.
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for diagnostic purposes.
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);

    // FIX: `this.setState` is now available because the class correctly extends React's `Component`.
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
    // FIX: `this.props` is now available because the class correctly extends React's `Component`.
    return this.props.children;
  }
}
