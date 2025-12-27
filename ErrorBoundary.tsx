
import React, { ErrorInfo, ReactNode } from 'react';
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
// FIX: Using React.Component explicitly ensures that TypeScript correctly recognizes the inherited properties and methods (state, setState, props) from the base React class.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Initialize state within the constructor.
    // FIX: Correctly initializing the state property inherited from React.Component.
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
    // FIX: Using this.setState which is provided by React.Component.
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  public render() {
    // Access state properties via 'this' safely.
    // FIX: Accessing this.state property inherited from React.Component.
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
    // FIX: Accessing this.props property inherited from React.Component.
    return this.props.children;
  }
}
