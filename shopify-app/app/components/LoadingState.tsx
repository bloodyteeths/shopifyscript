import {
  Card,
  Spinner,
  SkeletonBodyText,
  SkeletonDisplayText,
  Stack,
} from "@shopify/polaris";

interface LoadingStateProps {
  type?: "spinner" | "skeleton" | "minimal";
  message?: string;
  testId?: string;
}

export default function LoadingState({
  type = "spinner",
  message = "Loading...",
  testId = "loading-state",
}: LoadingStateProps) {
  if (type === "minimal") {
    return (
      <div
        style={{ textAlign: "center", padding: "1rem" }}
        data-testid={testId}
      >
        <Spinner size="small" />
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  if (type === "skeleton") {
    return (
      <Card sectioned data-testid={testId}>
        <Stack vertical>
          <SkeletonDisplayText size="medium" />
          <SkeletonBodyText lines={3} />
        </Stack>
      </Card>
    );
  }

  return (
    <Card sectioned data-testid={testId}>
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Spinner size="large" />
        <p style={{ marginTop: "1rem" }}>{message}</p>
      </div>
    </Card>
  );
}
