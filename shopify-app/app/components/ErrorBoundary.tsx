import React from "react";
import { Card, Button, Stack, TextStyle, Banner } from "@shopify/polaris";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to monitoring service
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            resetError={this.resetError}
          />
        );
      }

      return (
        <Card sectioned>
          <Stack vertical>
            <Banner status="critical">
              <p>
                <TextStyle variation="strong">Something went wrong</TextStyle>
              </p>
              <p>
                An unexpected error occurred. Please try refreshing the page or
                contact support if the problem persists.
              </p>
            </Banner>

            <details style={{ marginTop: "1rem" }}>
              <summary style={{ cursor: "pointer", marginBottom: "0.5rem" }}>
                Technical Details (for support)
              </summary>
              <pre
                style={{
                  background: "#f6f6f7",
                  padding: "1rem",
                  borderRadius: "4px",
                  fontSize: "0.8rem",
                  overflow: "auto",
                  maxHeight: "200px",
                }}
              >
                {this.state.error?.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>

            <Stack distribution="leading">
              <Button
                onClick={this.resetError}
                data-testid="error-boundary-retry"
              >
                Try Again
              </Button>
              <Button
                outline
                onClick={() => window.location.reload()}
                data-testid="error-boundary-refresh"
              >
                Refresh Page
              </Button>
            </Stack>
          </Stack>
        </Card>
      );
    }

    return this.props.children;
  }
}
