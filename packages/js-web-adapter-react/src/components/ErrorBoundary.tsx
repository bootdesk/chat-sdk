import React, { Component } from "react";
import type { ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    const { fallback } = this.props;
    if (typeof fallback === "function") {
      return (fallback as (error: Error) => ReactNode)(this.state.error);
    }
    if (fallback) return fallback;

    return (
      <div
        className="bdc-error-boundary"
        data-chat-error-boundary="true"
      >
        <div className="bdc-error-boundary-title">Something went wrong</div>
        <div className="bdc-error-boundary-msg">{this.state.error.message}</div>
        <button
          onClick={() => this.setState({ error: null })}
          className="bdc-error-boundary-retry"
        >
          Try again
        </button>
      </div>
    );
  }
}
