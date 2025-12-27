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
// Fix: Use Component directly from 'react' to ensure correct inheritance resolution and fix errors about missing base class.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Initializing state as a class property. Removed 'override' as it was failing due to inheritance resolution issues.
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  // Fix: Capture runtime rendering errors and update component state. Removed 'override' modifier.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for diagnostic purposes.
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    
    // Fix: setState is now correctly recognized as a member of Component.
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  // Fix: Correctly access 'state' and 'props' within the render method. Removed 'override' modifier.
  public render() {
    // Accessing inherited state.
    if (this.state.hasError) {
      // Render fallback UI when an error is caught.
      return (
        <CrashReport 
          error={this.state.error || new Error("An unknown error occurred.")} 
          componentStack={this.state.errorInfo?.componentStack || undefined} 
        />
      );
    }

    // Accessing inherited props.
    return this.props.children;
  }
}
