import { Stack, Badge, Icon, ProgressBar } from "@shopify/polaris";
import { CheckmarkIcon, ClockIcon } from "@shopify/polaris-icons";

interface Step {
  id: string;
  title: string;
  description?: string;
  isComplete: boolean;
  isActive: boolean;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  testId?: string;
}

export default function ProgressIndicator({
  steps,
  currentStep,
  onStepClick,
  testId = "progress-indicator",
}: ProgressIndicatorProps) {
  const completedCount = steps.filter((step) => step.isComplete).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div
      data-testid={testId}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <Stack vertical spacing="loose">
        <div>
          <p
            style={{
              marginBottom: "0.5rem",
              fontSize: "0.9rem",
              color: "#666",
            }}
          >
            {Math.round(progress)}% Complete ({completedCount} of {steps.length}{" "}
            steps)
          </p>
          <ProgressBar progress={progress} size="small" />
        </div>

        <Stack wrap spacing="tight">
          {steps.map((step, index) => {
            const isClickable =
              onStepClick && (step.isComplete || index <= currentStep);

            return (
              <div key={step.id} style={{ minWidth: "fit-content" }}>
                {isClickable ? (
                  <button
                    onClick={() => onStepClick(index)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                    data-testid={`step-${index}`}
                    aria-label={`Go to step ${index + 1}: ${step.title}`}
                  >
                    <StepBadge
                      step={step}
                      index={index}
                      currentStep={currentStep}
                    />
                  </button>
                ) : (
                  <div data-testid={`step-${index}`}>
                    <StepBadge
                      step={step}
                      index={index}
                      currentStep={currentStep}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </Stack>
      </Stack>
    </div>
  );
}

function StepBadge({
  step,
  index,
  currentStep,
}: {
  step: Step;
  index: number;
  currentStep: number;
}) {
  const getStatus = () => {
    if (step.isComplete) return "success";
    if (index === currentStep) return "attention";
    return "default";
  };

  const getIcon = () => {
    if (step.isComplete) return CheckmarkIcon;
    if (index === currentStep) return ClockIcon;
    return undefined;
  };

  const icon = getIcon();

  return (
    <Badge status={getStatus()}>
      {icon && <Icon source={icon} />}
      {icon && " "}
      {step.title}
    </Badge>
  );
}
