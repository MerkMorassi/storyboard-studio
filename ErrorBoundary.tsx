import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CrashReport } from './components/CrashReport';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch and display critical rendering errors.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for diagnostic purposes.
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  public override render() {
    // If an error was caught, render the technical crash report
    if (this.state.hasError) {
      return (
        <CrashReport 
          error={this.state.error || new Error("An unknown error occurred.")} 
          componentStack={this.state.errorInfo?.componentStack || undefined} 
        />
      );
    }

    // Otherwise, render children normally
    return this.props.children;
  }
}