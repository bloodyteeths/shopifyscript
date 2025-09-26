import {
  Card,
  FormLayout,
  TextField,
  Select,
  RangeSlider,
  RadioButton,
  Checkbox,
  Stack,
  Button,
  TextContainer,
  Banner,
  Badge,
  InlineGrid,
  Box,
  Text,
  BlockStack,
  Divider
} from '@shopify/polaris';
import { useState } from 'react';

interface CampaignConfig {
  businessName: string;
  businessType: string;
  mainProducts: string;
  targetAudience: string;
  dailyBudget: number;
  targetCPC: number;
  goal: string;
  alwaysOn: boolean;
  businessHours: {
    start: string;
    end: string;
    days: string[];
  };
  keywordStrategy: string;
  customKeywords: string;
  adTone: string;
  hasOffer: boolean;
  offerText: string;
}

export function CampaignSetupForm({
  shopName,
  onGenerate
}: {
  shopName: string;
  onGenerate: (config: CampaignConfig) => void;
}) {
  const [config, setConfig] = useState<CampaignConfig>({
    businessName: shopName,
    businessType: 'ecommerce',
    mainProducts: '',
    targetAudience: '',
    dailyBudget: 20,
    targetCPC: 0.50,
    goal: 'sales',
    alwaysOn: false,
    businessHours: {
      start: '09:00',
      end: '20:00',
      days: ['MON', 'TUE', 'WED', 'THU', 'FRI']
    },
    keywordStrategy: 'auto',
    customKeywords: '',
    adTone: 'friendly',
    hasOffer: false,
    offerText: ''
  });

  const businessTypeOptions = [
    { label: '🛍️ E-commerce Store', value: 'ecommerce' },
    { label: '🏢 Service Business', value: 'service' },
    { label: '📍 Local Business', value: 'local' },
    { label: '💼 B2B Company', value: 'b2b' }
  ];

  const goalOptions = [
    { label: '💰 Get more sales', value: 'sales' },
    { label: '🚀 Increase website traffic', value: 'traffic' },
    { label: '📧 Generate leads', value: 'leads' }
  ];

  const toneCards = [
    { id: 'professional', emoji: '👔', label: 'Professional' },
    { id: 'friendly', emoji: '😊', label: 'Friendly' },
    { id: 'urgent', emoji: '🔥', label: 'Urgent' },
    { id: 'luxury', emoji: '💎', label: 'Luxurious' }
  ];

  return (
    <BlockStack gap="600">
      <Banner title="Quick Campaign Setup" tone="info">
        <p>Answer a few simple questions to create your automated Google Ads campaign.
        Our AI will handle the rest!</p>
      </Banner>

      {/* Step 1: About Your Business */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            1. About Your Business
          </Text>

          <FormLayout>
            <TextField
              label="Business name"
              value={config.businessName}
              onChange={(value) => setConfig({...config, businessName: value})}
              autoComplete="off"
              disabled
            />

            <Select
              label="What type of business?"
              options={businessTypeOptions}
              value={config.businessType}
              onChange={(value) => setConfig({...config, businessType: value})}
            />

            <TextField
              label="What do you sell? (e.g., baby clothes, organic coffee)"
              value={config.mainProducts}
              onChange={(value) => setConfig({...config, mainProducts: value})}
              placeholder="Enter your main products or services"
              autoComplete="off"
            />

            <TextField
              label="Who is your target audience?"
              value={config.targetAudience}
              onChange={(value) => setConfig({...config, targetAudience: value})}
              placeholder="e.g., parents with young children"
              autoComplete="off"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      {/* Step 2: Budget & Goals */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            2. Budget & Goals
          </Text>

          <BlockStack gap="200">
            <RangeSlider
              label={`Daily budget: $${config.dailyBudget}`}
              value={config.dailyBudget}
              onChange={(value) => setConfig({...config, dailyBudget: value})}
              min={5}
              max={500}
              output
            />

            <RangeSlider
              label={`Target cost per click: $${config.targetCPC.toFixed(2)}`}
              value={config.targetCPC * 100}
              onChange={(value) => setConfig({...config, targetCPC: value / 100})}
              min={10}
              max={500}
              output
            />
          </BlockStack>

          <BlockStack gap="200">
            <Text variant="headingSm" as="h3">
              What's your main goal?
            </Text>
            <Stack>
              {goalOptions.map((option) => (
                <RadioButton
                  key={option.value}
                  label={option.label}
                  checked={config.goal === option.value}
                  onChange={() => setConfig({...config, goal: option.value})}
                />
              ))}
            </Stack>
          </BlockStack>
        </BlockStack>
      </Card>

      {/* Step 3: Schedule */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            3. When to Show Ads
          </Text>

          <Checkbox
            label="Show ads 24/7"
            checked={config.alwaysOn}
            onChange={(value) => setConfig({...config, alwaysOn: value})}
          />

          {!config.alwaysOn && (
            <BlockStack gap="200">
              <InlineGrid columns={2} gap="400">
                <TextField
                  label="Start time"
                  type="time"
                  value={config.businessHours.start}
                  onChange={(value) => setConfig({
                    ...config,
                    businessHours: {...config.businessHours, start: value}
                  })}
                  autoComplete="off"
                />
                <TextField
                  label="End time"
                  type="time"
                  value={config.businessHours.end}
                  onChange={(value) => setConfig({
                    ...config,
                    businessHours: {...config.businessHours, end: value}
                  })}
                  autoComplete="off"
                />
              </InlineGrid>

              <Stack>
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                  <Checkbox
                    key={day}
                    label={day}
                    checked={config.businessHours.days.includes(day)}
                    onChange={(checked) => {
                      const days = checked
                        ? [...config.businessHours.days, day]
                        : config.businessHours.days.filter(d => d !== day);
                      setConfig({
                        ...config,
                        businessHours: {...config.businessHours, days}
                      });
                    }}
                  />
                ))}
              </Stack>
            </BlockStack>
          )}
        </BlockStack>
      </Card>

      {/* Step 4: Keywords */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            4. Keyword Strategy
          </Text>

          <Stack>
            <RadioButton
              label="🤖 Let AI suggest keywords (Recommended)"
              checked={config.keywordStrategy === 'auto'}
              onChange={() => setConfig({...config, keywordStrategy: 'auto'})}
            />
            <RadioButton
              label="🏷️ Focus on my brand name"
              checked={config.keywordStrategy === 'brand'}
              onChange={() => setConfig({...config, keywordStrategy: 'brand'})}
            />
            <RadioButton
              label="🎯 Target competitor keywords"
              checked={config.keywordStrategy === 'competitor'}
              onChange={() => setConfig({...config, keywordStrategy: 'competitor'})}
            />
            <RadioButton
              label="✏️ Use custom keywords"
              checked={config.keywordStrategy === 'custom'}
              onChange={() => setConfig({...config, keywordStrategy: 'custom'})}
            />
          </Stack>

          {config.keywordStrategy === 'custom' && (
            <TextField
              label="Enter your keywords (comma separated)"
              value={config.customKeywords}
              onChange={(value) => setConfig({...config, customKeywords: value})}
              multiline={3}
              placeholder="organic baby clothes, eco friendly kids wear, sustainable children clothing"
              autoComplete="off"
            />
          )}
        </BlockStack>
      </Card>

      {/* Step 5: Ad Tone */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            5. Ad Tone & Style
          </Text>

          <InlineGrid columns={4} gap="400">
            {toneCards.map((tone) => (
              <Box
                key={tone.id}
                padding="400"
                background={config.adTone === tone.id ? 'bg-surface-selected' : 'bg-surface'}
                borderColor="border"
                borderWidth="025"
                borderRadius="200"
                onClick={() => setConfig({...config, adTone: tone.id})}
              >
                <BlockStack gap="200" inlineAlign="center">
                  <Text variant="headingLg" as="p">{tone.emoji}</Text>
                  <Text variant="bodyMd" as="p">{tone.label}</Text>
                </BlockStack>
              </Box>
            ))}
          </InlineGrid>
        </BlockStack>
      </Card>

      {/* Step 6: Special Offers */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">
            6. Special Offers (Optional)
          </Text>

          <Checkbox
            label="I have a special offer to promote"
            checked={config.hasOffer}
            onChange={(value) => setConfig({...config, hasOffer: value})}
          />

          {config.hasOffer && (
            <TextField
              label="What's your offer?"
              value={config.offerText}
              onChange={(value) => setConfig({...config, offerText: value})}
              placeholder="e.g., Free shipping on orders over $50"
              autoComplete="off"
            />
          )}
        </BlockStack>
      </Card>

      {/* Generate Button */}
      <Box padding="400">
        <Button
          variant="primary"
          size="large"
          fullWidth
          onClick={() => onGenerate(config)}
          disabled={!config.mainProducts || !config.targetAudience}
        >
          Generate My Automated Campaign Script
        </Button>
      </Box>
    </BlockStack>
  );
}