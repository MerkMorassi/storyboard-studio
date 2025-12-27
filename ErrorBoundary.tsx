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
// FIX: Using the named export 'Component' and extending it directly ensures TypeScript correctly identifies the base class and inherits state, setState, and props.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Initialize state within the constructor.
    // FIX: Properly initializing state inherited from React.Component.
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for diagnostic purposes.
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    
    // Capture error details in state using the base class setState method.
    // FIX: 'setState' is now properly recognized as an inherited member.
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  public render() {
    // Access state properties via 'this' safely.
    // FIX: 'this.state' is now properly recognized with correct ErrorBoundaryState types.
    if (this.state.hasError) {
      // Render fallback UI when an error is caught.
      return (
        <CrashReport 
          error={this.state.error || new Error("An unknown error occurred.")} 
          componentStack={this.state.errorInfo?.componentStack} 
        />
      );
    }

    // Access children through this.props.
    // FIX: 'this.props' is now properly recognized as an inherited member.
    return this.props.children;
  }
}
