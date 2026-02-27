/**
 * Campaign Creation Wizard
 * A step-by-step Polaris wizard for creating Google Ads campaigns.
 * 4 steps: Campaign Basics -> Keywords -> Ad Copy -> Review & Launch
 *
 * AI-assisted: After entering a landing page URL, the user can click
 * "Analyze with AI" to get suggestions for all fields. Suggestions
 * pre-fill the form and appear as clickable chips for alternatives.
 */

import React, { useState, useCallback, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Modal,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Select,
  Button,
  ButtonGroup,
  Badge,
  Banner,
  ProgressBar,
  Box,
  Divider,
  Tag,
} from "@shopify/polaris";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CampaignConfig {
  name: string;
  dailyBudget: number;
  biddingStrategy: string;
  websiteUrl: string;
  keywords: string[];
  negativeKeywords: string[];
  headlines: string[];
  descriptions: string[];
}

export interface AISuggestions {
  campaignNames: string[];
  biddingStrategy: { recommended: string; reason: string };
  keywords: string[];
  negativeKeywords: string[];
  headlines: string[];
  descriptions: string[];
  pageSummary: string;
}

export interface CampaignCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: CampaignConfig) => void;
  isSubmitting?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BIDDING_STRATEGY_OPTIONS = [
  { label: "Maximize Conversions", value: "MAXIMIZE_CONVERSIONS" },
  { label: "Maximize Clicks", value: "MAXIMIZE_CLICKS" },
  { label: "Manual CPC", value: "MANUAL_CPC" },
  { label: "Target ROAS", value: "TARGET_ROAS" },
];

const STEP_LABELS = [
  "Campaign Basics",
  "Keywords",
  "Ad Copy",
  "Review & Launch",
];

const HEADLINE_MAX_CHARS = 30;
const DESCRIPTION_MAX_CHARS = 90;
const MIN_HEADLINES = 3;
const MAX_HEADLINES = 15;
const MIN_DESCRIPTIONS = 2;
const MAX_DESCRIPTIONS = 4;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  SuggestionChips – clickable Tag row for AI suggestions             */
/* ------------------------------------------------------------------ */

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (value: string) => void;
  label?: string;
}

const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  onSelect,
  label = "AI suggestions:",
}) => {
  if (suggestions.length === 0) return null;

  return (
    <BlockStack gap="200">
      <Text as="span" variant="bodySm" tone="subdued">
        {label}
      </Text>
      <InlineStack gap="200" wrap>
        {suggestions.map((suggestion, index) => (
          <div
            key={`sug-${index}-${suggestion.substring(0, 10)}`}
            onClick={() => onSelect(suggestion)}
            style={{ cursor: "pointer" }}
          >
            <Tag>{suggestion}</Tag>
          </div>
        ))}
      </InlineStack>
    </BlockStack>
  );
};

/* ------------------------------------------------------------------ */
/*  Step 1 – Campaign Basics                                           */
/* ------------------------------------------------------------------ */

interface StepBasicsProps {
  name: string;
  dailyBudget: string;
  biddingStrategy: string;
  websiteUrl: string;
  onNameChange: (value: string) => void;
  onBudgetChange: (value: string) => void;
  onStrategyChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  errors: Record<string, string>;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analyzeError: string | null;
  aiSuggestions: AISuggestions | null;
}

const StepBasics: React.FC<StepBasicsProps> = ({
  name,
  dailyBudget,
  biddingStrategy,
  websiteUrl,
  onNameChange,
  onBudgetChange,
  onStrategyChange,
  onUrlChange,
  errors,
  onAnalyze,
  isAnalyzing,
  analyzeError,
  aiSuggestions,
}) => (
  <BlockStack gap="400">
    <Text as="h2" variant="headingMd">
      Campaign Basics
    </Text>
    <Text as="p" variant="bodyMd" tone="subdued">
      Enter your landing page URL and let AI suggest campaign settings, or fill
      in everything manually.
    </Text>

    <Divider />

    <TextField
      label="Website URL"
      value={websiteUrl}
      onChange={onUrlChange}
      autoComplete="off"
      placeholder="https://example.com/landing-page"
      helpText="The landing page users will visit when they click your ad."
      error={errors.websiteUrl}
      requiredIndicator
    />

    <InlineStack gap="200" blockAlign="center">
      <Button
        onClick={onAnalyze}
        loading={isAnalyzing}
        disabled={!websiteUrl.trim() || isAnalyzing}
      >
        Analyze with AI
      </Button>
      {isAnalyzing && (
        <Text as="span" variant="bodySm" tone="subdued">
          Analyzing page content...
        </Text>
      )}
    </InlineStack>

    {analyzeError && (
      <Banner tone="warning">
        <p>{analyzeError}</p>
      </Banner>
    )}

    {aiSuggestions && !isAnalyzing && (
      <Banner tone="info">
        <p>
          AI analyzed your page and pre-filled suggestions across all steps.
          You can modify any field or click alternative suggestions below.
        </p>
      </Banner>
    )}

    <Divider />

    <TextField
      label="Campaign Name"
      value={name}
      onChange={onNameChange}
      autoComplete="off"
      placeholder="e.g. Summer Sale - Search"
      error={errors.name}
      requiredIndicator
    />

    {aiSuggestions && aiSuggestions.campaignNames.length > 0 && (
      <SuggestionChips
        suggestions={aiSuggestions.campaignNames.filter(
          (n) => n.toLowerCase() !== name.toLowerCase(),
        )}
        onSelect={onNameChange}
        label="AI-suggested names (click to use):"
      />
    )}

    <TextField
      label="Daily Budget (USD)"
      type="number"
      value={dailyBudget}
      onChange={onBudgetChange}
      autoComplete="off"
      min={1}
      prefix="$"
      helpText="The average amount you're willing to spend per day."
      error={errors.dailyBudget}
      requiredIndicator
    />

    <Select
      label="Bidding Strategy"
      options={BIDDING_STRATEGY_OPTIONS}
      value={biddingStrategy}
      onChange={onStrategyChange}
      helpText={
        aiSuggestions?.biddingStrategy?.reason
          ? `AI recommendation: ${aiSuggestions.biddingStrategy.reason}`
          : "Determines how Google optimizes your bids."
      }
    />
  </BlockStack>
);

/* ------------------------------------------------------------------ */
/*  Step 2 – Keywords                                                  */
/* ------------------------------------------------------------------ */

interface StepKeywordsProps {
  keywordsText: string;
  negativeKeywordsText: string;
  onKeywordsChange: (value: string) => void;
  onNegativeKeywordsChange: (value: string) => void;
  errors: Record<string, string>;
  aiSuggestions: AISuggestions | null;
}

const StepKeywords: React.FC<StepKeywordsProps> = ({
  keywordsText,
  negativeKeywordsText,
  onKeywordsChange,
  onNegativeKeywordsChange,
  errors,
  aiSuggestions,
}) => {
  const keywordCount = parseLines(keywordsText).length;
  const negativeKeywordCount = parseLines(negativeKeywordsText).length;

  const currentKeywords = new Set(
    parseLines(keywordsText).map((k) => k.toLowerCase()),
  );
  const currentNegatives = new Set(
    parseLines(negativeKeywordsText).map((k) => k.toLowerCase()),
  );

  const unusedKeywords = (aiSuggestions?.keywords || []).filter(
    (k) => !currentKeywords.has(k.toLowerCase()),
  );
  const unusedNegatives = (aiSuggestions?.negativeKeywords || []).filter(
    (k) => !currentNegatives.has(k.toLowerCase()),
  );

  return (
    <BlockStack gap="400">
      <Text as="h2" variant="headingMd">
        Keywords
      </Text>
      <Text as="p" variant="bodyMd" tone="subdued">
        Enter keywords your customers might search for. Your ads will show when
        people search for these terms.
      </Text>

      <Divider />

      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            Keywords
          </Text>
          <Badge tone={keywordCount > 0 ? "success" : undefined}>
            {`${keywordCount} keyword${keywordCount !== 1 ? "s" : ""}`}
          </Badge>
        </InlineStack>
        <TextField
          label="Keywords"
          labelHidden
          value={keywordsText}
          onChange={onKeywordsChange}
          multiline={6}
          autoComplete="off"
          placeholder={"running shoes\nbest sneakers\nbuy athletic footwear"}
          helpText="Enter one keyword or phrase per line."
          error={errors.keywords}
        />
        {unusedKeywords.length > 0 && (
          <SuggestionChips
            suggestions={unusedKeywords}
            onSelect={(keyword) => {
              const current = keywordsText.trim();
              onKeywordsChange(current ? `${current}\n${keyword}` : keyword);
            }}
            label="AI-suggested keywords (click to add):"
          />
        )}
      </BlockStack>

      <Divider />

      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            Negative Keywords (optional)
          </Text>
          <Badge>
            {`${negativeKeywordCount} negative keyword${negativeKeywordCount !== 1 ? "s" : ""}`}
          </Badge>
        </InlineStack>
        <TextField
          label="Negative Keywords"
          labelHidden
          value={negativeKeywordsText}
          onChange={onNegativeKeywordsChange}
          multiline={4}
          autoComplete="off"
          placeholder={"free\ncheap\nused"}
          helpText="Prevent your ads from showing for these search terms. One per line."
        />
        {unusedNegatives.length > 0 && (
          <SuggestionChips
            suggestions={unusedNegatives}
            onSelect={(keyword) => {
              const current = negativeKeywordsText.trim();
              onNegativeKeywordsChange(
                current ? `${current}\n${keyword}` : keyword,
              );
            }}
            label="AI-suggested negative keywords (click to add):"
          />
        )}
      </BlockStack>
    </BlockStack>
  );
};

/* ------------------------------------------------------------------ */
/*  Step 3 – Ad Copy                                                   */
/* ------------------------------------------------------------------ */

interface StepAdCopyProps {
  headlines: string[];
  descriptions: string[];
  onHeadlineChange: (index: number, value: string) => void;
  onHeadlineAdd: () => void;
  onHeadlineRemove: (index: number) => void;
  onDescriptionChange: (index: number, value: string) => void;
  onDescriptionAdd: () => void;
  onDescriptionRemove: (index: number) => void;
  errors: Record<string, string>;
  aiSuggestions: AISuggestions | null;
}

const StepAdCopy: React.FC<StepAdCopyProps> = ({
  headlines,
  descriptions,
  onHeadlineChange,
  onHeadlineAdd,
  onHeadlineRemove,
  onDescriptionChange,
  onDescriptionAdd,
  onDescriptionRemove,
  errors,
  aiSuggestions,
}) => {
  const usedHeadlines = new Set(
    headlines.map((h) => h.toLowerCase().trim()).filter(Boolean),
  );
  const usedDescriptions = new Set(
    descriptions.map((d) => d.toLowerCase().trim()).filter(Boolean),
  );

  const unusedHeadlines = (aiSuggestions?.headlines || []).filter(
    (h) => !usedHeadlines.has(h.toLowerCase().trim()),
  );
  const unusedDescriptions = (aiSuggestions?.descriptions || []).filter(
    (d) => !usedDescriptions.has(d.toLowerCase().trim()),
  );

  const handleSelectHeadline = (headline: string) => {
    const emptyIndex = headlines.findIndex((h) => h.trim() === "");
    if (emptyIndex >= 0) {
      onHeadlineChange(emptyIndex, headline);
    } else if (headlines.length < MAX_HEADLINES) {
      onHeadlineAdd();
      // The add creates an empty slot at end, fill it on next render
      // We directly set it via the change handler at the new index
      setTimeout(() => onHeadlineChange(headlines.length, headline), 0);
    }
  };

  const handleSelectDescription = (description: string) => {
    const emptyIndex = descriptions.findIndex((d) => d.trim() === "");
    if (emptyIndex >= 0) {
      onDescriptionChange(emptyIndex, description);
    } else if (descriptions.length < MAX_DESCRIPTIONS) {
      onDescriptionAdd();
      setTimeout(() => onDescriptionChange(descriptions.length, description), 0);
    }
  };

  return (
    <BlockStack gap="400">
      <Text as="h2" variant="headingMd">
        Ad Copy
      </Text>
      <Text as="p" variant="bodyMd" tone="subdued">
        Write compelling headlines and descriptions for your responsive search ad.
        Google will test different combinations to find the best performers.
      </Text>

      <Divider />

      {/* Headlines */}
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            Headlines ({MIN_HEADLINES} required, up to {MAX_HEADLINES})
          </Text>
          <Badge tone={headlines.length >= MIN_HEADLINES ? "success" : "warning"}>
            {`${headlines.length} / ${MAX_HEADLINES}`}
          </Badge>
        </InlineStack>

        {errors.headlines && (
          <Banner tone="critical">
            <p>{errors.headlines}</p>
          </Banner>
        )}

        {headlines.map((headline, index) => (
          <InlineStack key={`headline-${index}`} gap="200" blockAlign="start" wrap={false}>
            <div style={{ flex: 1 }}>
              <TextField
                label={`Headline ${index + 1}`}
                labelHidden
                value={headline}
                onChange={(value) => onHeadlineChange(index, value)}
                autoComplete="off"
                maxLength={HEADLINE_MAX_CHARS}
                showCharacterCount
                placeholder={`Headline ${index + 1}`}
                error={
                  headline.length > HEADLINE_MAX_CHARS
                    ? `Max ${HEADLINE_MAX_CHARS} characters`
                    : undefined
                }
              />
            </div>
            {headlines.length > MIN_HEADLINES && (
              <div style={{ paddingTop: "4px" }}>
                <Button
                  variant="plain"
                  tone="critical"
                  onClick={() => onHeadlineRemove(index)}
                >
                  Remove
                </Button>
              </div>
            )}
          </InlineStack>
        ))}

        {unusedHeadlines.length > 0 && (
          <SuggestionChips
            suggestions={unusedHeadlines}
            onSelect={handleSelectHeadline}
            label="AI-suggested headlines (click to use):"
          />
        )}

        {headlines.length < MAX_HEADLINES && (
          <Button onClick={onHeadlineAdd}>
            + Add Headline
          </Button>
        )}
      </BlockStack>

      <Divider />

      {/* Descriptions */}
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            Descriptions ({MIN_DESCRIPTIONS} required, up to {MAX_DESCRIPTIONS})
          </Text>
          <Badge
            tone={
              descriptions.length >= MIN_DESCRIPTIONS ? "success" : "warning"
            }
          >
            {`${descriptions.length} / ${MAX_DESCRIPTIONS}`}
          </Badge>
        </InlineStack>

        {errors.descriptions && (
          <Banner tone="critical">
            <p>{errors.descriptions}</p>
          </Banner>
        )}

        {descriptions.map((description, index) => (
          <InlineStack key={`desc-${index}`} gap="200" blockAlign="start" wrap={false}>
            <div style={{ flex: 1 }}>
              <TextField
                label={`Description ${index + 1}`}
                labelHidden
                value={description}
                onChange={(value) => onDescriptionChange(index, value)}
                autoComplete="off"
                maxLength={DESCRIPTION_MAX_CHARS}
                showCharacterCount
                placeholder={`Description ${index + 1}`}
                error={
                  description.length > DESCRIPTION_MAX_CHARS
                    ? `Max ${DESCRIPTION_MAX_CHARS} characters`
                    : undefined
                }
              />
            </div>
            {descriptions.length > MIN_DESCRIPTIONS && (
              <div style={{ paddingTop: "4px" }}>
                <Button
                  variant="plain"
                  tone="critical"
                  onClick={() => onDescriptionRemove(index)}
                >
                  Remove
                </Button>
              </div>
            )}
          </InlineStack>
        ))}

        {unusedDescriptions.length > 0 && (
          <SuggestionChips
            suggestions={unusedDescriptions}
            onSelect={handleSelectDescription}
            label="AI-suggested descriptions (click to use):"
          />
        )}

        {descriptions.length < MAX_DESCRIPTIONS && (
          <Button onClick={onDescriptionAdd}>
            + Add Description
          </Button>
        )}
      </BlockStack>
    </BlockStack>
  );
};

/* ------------------------------------------------------------------ */
/*  Step 4 – Review & Launch                                           */
/* ------------------------------------------------------------------ */

interface StepReviewProps {
  config: CampaignConfig;
}

function strategyLabel(value: string): string {
  const match = BIDDING_STRATEGY_OPTIONS.find((o) => o.value === value);
  return match ? match.label : value;
}

const StepReview: React.FC<StepReviewProps> = ({ config }) => (
  <BlockStack gap="400">
    <Text as="h2" variant="headingMd">
      Review & Launch
    </Text>
    <Text as="p" variant="bodyMd" tone="subdued">
      Review your campaign settings before creating it.
    </Text>

    <Divider />

    <Banner tone="warning">
      <p>
        Your campaign will be created in a <strong>PAUSED</strong> state. You
        can enable it from Google Ads once you have verified all settings.
      </p>
    </Banner>

    {/* Campaign Settings */}
    <Card>
      <Box padding="400">
        <BlockStack gap="300">
          <Text as="h3" variant="headingMd">
            Campaign Settings
          </Text>
          <Divider />
          <InlineStack gap="200">
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              Name:
            </Text>
            <Text as="span" variant="bodyMd">
              {config.name}
            </Text>
          </InlineStack>
          <InlineStack gap="200">
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              Daily Budget:
            </Text>
            <Text as="span" variant="bodyMd">
              ${config.dailyBudget.toFixed(2)}
            </Text>
          </InlineStack>
          <InlineStack gap="200">
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              Bidding Strategy:
            </Text>
            <Badge>{strategyLabel(config.biddingStrategy)}</Badge>
          </InlineStack>
          <InlineStack gap="200">
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              Website URL:
            </Text>
            <Text as="span" variant="bodyMd">
              {config.websiteUrl}
            </Text>
          </InlineStack>
        </BlockStack>
      </Box>
    </Card>

    {/* Keywords */}
    <Card>
      <Box padding="400">
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">
              Keywords
            </Text>
            <InlineStack gap="200">
              <Badge tone="success">
                {`${config.keywords.length} keyword${config.keywords.length !== 1 ? "s" : ""}`}
              </Badge>
              {config.negativeKeywords.length > 0 && (
                <Badge>
                  {`${config.negativeKeywords.length} negative`}
                </Badge>
              )}
            </InlineStack>
          </InlineStack>
          <Divider />
          <InlineStack gap="200" wrap>
            {config.keywords.map((kw, i) => (
              <Tag key={`kw-${i}`}>{kw}</Tag>
            ))}
          </InlineStack>
          {config.negativeKeywords.length > 0 && (
            <>
              <Text as="span" variant="bodySm" fontWeight="semibold">
                Negative keywords:
              </Text>
              <InlineStack gap="200" wrap>
                {config.negativeKeywords.map((nkw, i) => (
                  <Tag key={`nkw-${i}`}>{nkw}</Tag>
                ))}
              </InlineStack>
            </>
          )}
        </BlockStack>
      </Box>
    </Card>

    {/* Ad Copy */}
    <Card>
      <Box padding="400">
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">
              Ad Copy
            </Text>
            <InlineStack gap="200">
              <Badge tone="success">
                {`${config.headlines.length} headline${config.headlines.length !== 1 ? "s" : ""}`}
              </Badge>
              <Badge tone="success">
                {`${config.descriptions.length} description${config.descriptions.length !== 1 ? "s" : ""}`}
              </Badge>
            </InlineStack>
          </InlineStack>
          <Divider />

          <Text as="span" variant="bodySm" fontWeight="semibold">
            Headlines:
          </Text>
          <BlockStack gap="100">
            {config.headlines.map((h, i) => (
              <Text key={`review-h-${i}`} as="p" variant="bodyMd">
                {i + 1}. {h}
              </Text>
            ))}
          </BlockStack>

          <Text as="span" variant="bodySm" fontWeight="semibold">
            Descriptions:
          </Text>
          <BlockStack gap="100">
            {config.descriptions.map((d, i) => (
              <Text key={`review-d-${i}`} as="p" variant="bodyMd">
                {i + 1}. {d}
              </Text>
            ))}
          </BlockStack>
        </BlockStack>
      </Box>
    </Card>
  </BlockStack>
);

/* ------------------------------------------------------------------ */
/*  Main Wizard Component                                              */
/* ------------------------------------------------------------------ */

export const CampaignCreationWizard: React.FC<CampaignCreationWizardProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  /* ---------- State ---------- */
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 fields
  const [name, setName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [biddingStrategy, setBiddingStrategy] = useState(
    BIDDING_STRATEGY_OPTIONS[0].value,
  );
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Step 2 fields
  const [keywordsText, setKeywordsText] = useState("");
  const [negativeKeywordsText, setNegativeKeywordsText] = useState("");

  // Step 3 fields
  const [headlines, setHeadlines] = useState<string[]>(["", "", ""]);
  const [descriptions, setDescriptions] = useState<string[]>(["", ""]);

  // AI state
  const analyzeFetcher = useFetcher();
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const isAnalyzing =
    analyzeFetcher.state === "submitting" || analyzeFetcher.state === "loading";

  const totalSteps = STEP_LABELS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  /* ---------- Handle AI analysis results ---------- */
  useEffect(() => {
    if (!analyzeFetcher.data) return;

    const data = analyzeFetcher.data as {
      ok?: boolean;
      suggestions?: AISuggestions;
      error?: string;
    };

    if (data.ok && data.suggestions) {
      const s = data.suggestions;
      setAiSuggestions(s);
      setAnalyzeError(null);

      // Pre-fill campaign name (only if empty)
      if (s.campaignNames.length > 0 && !name.trim()) {
        setName(s.campaignNames[0]);
      }

      // Pre-fill bidding strategy
      if (s.biddingStrategy.recommended) {
        setBiddingStrategy(s.biddingStrategy.recommended);
      }

      // Pre-fill keywords (only if empty)
      if (s.keywords.length > 0 && !keywordsText.trim()) {
        setKeywordsText(s.keywords.join("\n"));
      }

      // Pre-fill negative keywords (only if empty)
      if (s.negativeKeywords.length > 0 && !negativeKeywordsText.trim()) {
        setNegativeKeywordsText(s.negativeKeywords.join("\n"));
      }

      // Pre-fill headlines (first 3 into default slots)
      if (s.headlines.length >= MIN_HEADLINES) {
        const newHeadlines = s.headlines.slice(0, MIN_HEADLINES);
        setHeadlines(newHeadlines);
      }

      // Pre-fill descriptions (first 2 into default slots)
      if (s.descriptions.length >= MIN_DESCRIPTIONS) {
        const newDescs = s.descriptions.slice(0, MIN_DESCRIPTIONS);
        setDescriptions(newDescs);
      }
    } else {
      setAnalyzeError(
        data.error || "Analysis failed. You can still fill in fields manually.",
      );
    }
  }, [analyzeFetcher.data]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- AI analyze handler ---------- */
  const handleAnalyzeUrl = useCallback(() => {
    if (!websiteUrl.trim() || !isValidUrl(websiteUrl.trim())) {
      setErrors({ websiteUrl: "Please enter a valid URL before analyzing." });
      return;
    }
    setAnalyzeError(null);
    analyzeFetcher.submit(
      { url: websiteUrl.trim() },
      { method: "post", action: "/api/campaign-analyze" },
    );
  }, [websiteUrl, analyzeFetcher]);

  /* ---------- Build config from current state ---------- */
  const buildConfig = useCallback((): CampaignConfig => {
    return {
      name: name.trim(),
      dailyBudget: parseFloat(dailyBudget) || 0,
      biddingStrategy,
      websiteUrl: websiteUrl.trim(),
      keywords: parseLines(keywordsText),
      negativeKeywords: parseLines(negativeKeywordsText),
      headlines: headlines.map((h) => h.trim()).filter((h) => h.length > 0),
      descriptions: descriptions
        .map((d) => d.trim())
        .filter((d) => d.length > 0),
    };
  }, [
    name,
    dailyBudget,
    biddingStrategy,
    websiteUrl,
    keywordsText,
    negativeKeywordsText,
    headlines,
    descriptions,
  ]);

  /* ---------- Validation ---------- */
  const validateStep = useCallback(
    (step: number): boolean => {
      const newErrors: Record<string, string> = {};

      if (step === 0) {
        if (!name.trim()) {
          newErrors.name = "Campaign name is required.";
        }
        const budgetNum = parseFloat(dailyBudget);
        if (!dailyBudget || isNaN(budgetNum) || budgetNum < 1) {
          newErrors.dailyBudget = "Daily budget must be at least $1.";
        }
        if (!websiteUrl.trim()) {
          newErrors.websiteUrl = "Website URL is required.";
        } else if (!isValidUrl(websiteUrl.trim())) {
          newErrors.websiteUrl =
            "Please enter a valid URL (e.g. https://example.com).";
        }
      }

      if (step === 1) {
        const kws = parseLines(keywordsText);
        if (kws.length === 0) {
          newErrors.keywords = "At least one keyword is required.";
        }
      }

      if (step === 2) {
        const filledHeadlines = headlines
          .map((h) => h.trim())
          .filter((h) => h.length > 0);
        if (filledHeadlines.length < MIN_HEADLINES) {
          newErrors.headlines = `At least ${MIN_HEADLINES} headlines are required. You have ${filledHeadlines.length}.`;
        }
        const overLimitHeadline = headlines.find(
          (h) => h.trim().length > HEADLINE_MAX_CHARS,
        );
        if (overLimitHeadline) {
          newErrors.headlines = `Each headline must be ${HEADLINE_MAX_CHARS} characters or fewer.`;
        }

        const filledDescriptions = descriptions
          .map((d) => d.trim())
          .filter((d) => d.length > 0);
        if (filledDescriptions.length < MIN_DESCRIPTIONS) {
          newErrors.descriptions = `At least ${MIN_DESCRIPTIONS} descriptions are required. You have ${filledDescriptions.length}.`;
        }
        const overLimitDescription = descriptions.find(
          (d) => d.trim().length > DESCRIPTION_MAX_CHARS,
        );
        if (overLimitDescription) {
          newErrors.descriptions = `Each description must be ${DESCRIPTION_MAX_CHARS} characters or fewer.`;
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [name, dailyBudget, websiteUrl, keywordsText, headlines, descriptions],
  );

  /* ---------- Navigation ---------- */
  const handleNext = useCallback(() => {
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    }
  }, [currentStep, totalSteps, validateStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  }, [currentStep]);

  const handleSubmit = useCallback(() => {
    onSubmit(buildConfig());
  }, [buildConfig, onSubmit]);

  /* ---------- Headline helpers ---------- */
  const handleHeadlineChange = useCallback(
    (index: number, value: string) => {
      const updated = [...headlines];
      updated[index] = value;
      setHeadlines(updated);
    },
    [headlines],
  );

  const handleHeadlineAdd = useCallback(() => {
    if (headlines.length < MAX_HEADLINES) {
      setHeadlines([...headlines, ""]);
    }
  }, [headlines]);

  const handleHeadlineRemove = useCallback(
    (index: number) => {
      if (headlines.length > MIN_HEADLINES) {
        setHeadlines(headlines.filter((_, i) => i !== index));
      }
    },
    [headlines],
  );

  /* ---------- Description helpers ---------- */
  const handleDescriptionChange = useCallback(
    (index: number, value: string) => {
      const updated = [...descriptions];
      updated[index] = value;
      setDescriptions(updated);
    },
    [descriptions],
  );

  const handleDescriptionAdd = useCallback(() => {
    if (descriptions.length < MAX_DESCRIPTIONS) {
      setDescriptions([...descriptions, ""]);
    }
  }, [descriptions]);

  const handleDescriptionRemove = useCallback(
    (index: number) => {
      if (descriptions.length > MIN_DESCRIPTIONS) {
        setDescriptions(descriptions.filter((_, i) => i !== index));
      }
    },
    [descriptions],
  );

  /* ---------- Render current step ---------- */
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepBasics
            name={name}
            dailyBudget={dailyBudget}
            biddingStrategy={biddingStrategy}
            websiteUrl={websiteUrl}
            onNameChange={setName}
            onBudgetChange={setDailyBudget}
            onStrategyChange={setBiddingStrategy}
            onUrlChange={setWebsiteUrl}
            errors={errors}
            onAnalyze={handleAnalyzeUrl}
            isAnalyzing={isAnalyzing}
            analyzeError={analyzeError}
            aiSuggestions={aiSuggestions}
          />
        );
      case 1:
        return (
          <StepKeywords
            keywordsText={keywordsText}
            negativeKeywordsText={negativeKeywordsText}
            onKeywordsChange={setKeywordsText}
            onNegativeKeywordsChange={setNegativeKeywordsText}
            errors={errors}
            aiSuggestions={aiSuggestions}
          />
        );
      case 2:
        return (
          <StepAdCopy
            headlines={headlines}
            descriptions={descriptions}
            onHeadlineChange={handleHeadlineChange}
            onHeadlineAdd={handleHeadlineAdd}
            onHeadlineRemove={handleHeadlineRemove}
            onDescriptionChange={handleDescriptionChange}
            onDescriptionAdd={handleDescriptionAdd}
            onDescriptionRemove={handleDescriptionRemove}
            errors={errors}
            aiSuggestions={aiSuggestions}
          />
        );
      case 3:
        return <StepReview config={buildConfig()} />;
      default:
        return null;
    }
  };

  /* ---------- Render ---------- */
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Create Google Ads Campaign"
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Progress indicator */}
          <Card>
            <Box padding="400">
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">
                    Step {currentStep + 1} of {totalSteps}:{" "}
                    {STEP_LABELS[currentStep]}
                  </Text>
                  <Badge>
                    {`${currentStep + 1}/${totalSteps}`}
                  </Badge>
                </InlineStack>
                <ProgressBar progress={progress} size="small" />
                <InlineStack align="space-between">
                  <InlineStack gap="200">
                    {STEP_LABELS.map((label, index) => (
                      <Badge
                        key={label}
                        tone={
                          index < currentStep
                            ? "success"
                            : index === currentStep
                              ? "info"
                              : undefined
                        }
                      >
                        {`${index + 1}. ${label}`}
                      </Badge>
                    ))}
                  </InlineStack>
                </InlineStack>
              </BlockStack>
            </Box>
          </Card>

          {/* Step content */}
          {renderStep()}

          {/* Navigation buttons */}
          <Divider />
          <InlineStack align="space-between" blockAlign="center">
            <Button onClick={onClose}>Close</Button>

            <ButtonGroup>
              {currentStep > 0 && (
                <Button onClick={handlePrevious}>Previous</Button>
              )}
              {currentStep < totalSteps - 1 ? (
                <Button variant="primary" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  loading={isSubmitting}
                >
                  Create Campaign
                </Button>
              )}
            </ButtonGroup>
          </InlineStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
};

export default CampaignCreationWizard;
