
import React, { ErrorInfo } from 'react';
import { CrashReport } from './components/CrashReport';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Fixed: Explicitly using React.Component to ensure TypeScript correctly identifies the base class properties like setState and props.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    // Fixed: setState is now correctly identified via React.Component inheritance
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <CrashReport 
          error={this.state.error || new Error("An unknown error occurred.")} 
          componentStack={this.state.errorInfo?.componentStack} 
        />
      );
    }

    // Fixed: props is now correctly identified via React.Component inheritance
    return this.props.children;
  }
}
