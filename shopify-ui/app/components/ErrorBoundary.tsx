import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; reset?: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} reset={this.reset} />;
      }

      return (
        <div
          style={{
            padding: "2rem",
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: "8px",
            margin: "1rem",
          }}
        >
          <h2>🚨 Something went wrong</h2>
          <p>The page encountered an error and couldn't render properly.</p>
          <details style={{ marginTop: "1rem" }}>
            <summary>Error Details</summary>
            <pre style={{ fontSize: "12px", overflow: "auto" }}>
              {this.state.error?.message || "Unknown error"}
            </pre>
          </details>
          <button
            onClick={this.reset}
            style={{
              marginTop: "1rem",
              padding: "8px 16px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔄 Try Again
          </button>
          <button
            onClick={() => window.location.href = "/app"}
            style={{
              marginTop: "1rem",
              marginLeft: "8px",
              padding: "8px 16px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🏠 Go to Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}