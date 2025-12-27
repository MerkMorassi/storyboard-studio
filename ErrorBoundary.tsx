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
// Fix: Use React.Component and class property initialization to resolve inheritance issues where 'state', 'props', and 'setState' were not recognized.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Initializing state as a class property ensures it is correctly typed and recognized by TypeScript.
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  // Fix: super() is implicitly called if no constructor is provided, but we can omit it when using property initializers.

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  // Fix: Capture runtime rendering errors and update component state using inherited setState.
  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for diagnostic purposes.
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    
    // Fix: setState is now correctly recognized as a member of React.Component.
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  // Fix: Correctly access 'state' and 'props' within the render method.
  public override render() {
    // Fix: Accessing inherited state.
    if (this.state.hasError) {
      // Render fallback UI when an error is caught.
      return (
        <CrashReport 
          error={this.state.error || new Error("An unknown error occurred.")} 
          componentStack={this.state.errorInfo?.componentStack || undefined} 
        />
      );
    }

    // Fix: Accessing inherited props.
    return this.props.children;
  }
}
