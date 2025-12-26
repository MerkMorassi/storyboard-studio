
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CrashReport } from './components/CrashReport';

// Fixed: children is made optional to satisfy JSX type checks in index.tsx where it is used as a wrapper
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
// Fixed: Explicitly extend Component from react to ensure state/props properties are correctly inherited and recognized by TypeScript
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Fixed: Initialize state correctly within the constructor
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
    // Log the error for diagnostic purposes
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    
    // Fixed: Use setState from the base Component class to capture error details
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  public render() {
    // Fixed: Correctly access state through 'this' to check for errors
    if (this.state.hasError) {
      // Render fallback UI when an error is caught
      return (
        <CrashReport 
          error={this.state.error || new Error("An unknown error occurred.")} 
          componentStack={this.state.errorInfo?.componentStack} 
        />
      );
    }

    // Fixed: Correctly access children through this.props
    return this.props.children;
  }
}
