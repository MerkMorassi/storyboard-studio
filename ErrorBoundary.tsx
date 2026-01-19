
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
// FIX: The class now correctly extends React's `Component` to gain access to lifecycle methods, props, and state.
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

    // FIX: `this.props` is now available because the class correctly extends React's `Component`.
    return this.props.children;
  }
}
