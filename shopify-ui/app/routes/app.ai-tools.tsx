import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Tabs,
  Card,
  BlockStack,
  Text,
  Banner,
  Badge,
  Button,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { backendFetch } from "../server/hmac.server";
import {
  checkSubscriptionStatus,
  hasFeatureAccess,
} from "../utils/subscription.server";
import { AIContentStudio } from "../components/AIDashboard/AIContentStudio";
import { CompetitorIntel } from "../components/AIDashboard/DataSources/CompetitorIntel";

interface LoaderData {
  shopName: string;
  connected: boolean;
  planSelectionUrl: string;
  isProfessionalPlus: boolean;
  hasAiAccess: boolean;
  competitorData: Record<string, unknown> | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);

  const shopName = session?.shop?.replace(".myshopify.com", "") ?? "";
  if (!shopName) {
    throw new Response("Unable to determine shop name", { status: 400 });
  }

  const subscriptionInfo = await checkSubscriptionStatus(admin);

  // Check Google Ads connection status
  let connected = false;
  try {
    const { status, json: result } = await backendFetch(
      "/google-ads/connection-status",
      "GET",
      undefined,
      shopName,
    );
    connected = status === 200 && result?.connected === true;
  } catch (err) {
    console.error("Failed to check Google Ads connection:", err);
  }

  const tier = subscriptionInfo.subscriptionTier;
  const isProfessionalPlus = tier === "professional" || tier === "enterprise";
  const hasAiAccess = hasFeatureAccess(subscriptionInfo, "advanced_ai_optimization");

  // Fetch competitor data for Pro+ users
  let competitorData: Record<string, unknown> | null = null;
  if (connected && isProfessionalPlus) {
    try {
      const { status, json: result } = await backendFetch(
        "/dashboard/insights/competitors",
        "GET",
        undefined,
        shopName,
      );
      if (status === 200 && result?.success) {
        competitorData = result.data;
      }
    } catch (err) {
      console.error("Failed to fetch competitor data:", err);
    }
  }

  const appHandle = process.env.SHOPIFY_APP_HANDLE || "adsautopilot-autopilot";
  const planSelectionUrl = `https://admin.shopify.com/store/${shopName}/charges/${appHandle}/pricing_plans`;

  return json<LoaderData>({
    shopName,
    connected,
    planSelectionUrl,
    isProfessionalPlus,
    hasAiAccess,
    competitorData,
  });
}

export default function AIToolsPage() {
  const { shopName, connected, planSelectionUrl, isProfessionalPlus, hasAiAccess, competitorData } =
    useLoaderData<typeof loader>();

  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    { id: "ad-copy", content: "Ad Copy Generator" },
    {
      id: "competitor-insights",
      content: isProfessionalPlus ? "Competitor Insights" : "Competitor Insights (Pro+)",
    },
  ];

  if (!connected) {
    return (
      <Page title="AI Tools">
        <BlockStack gap="400">
          <Banner
            title="Connect Google Ads to unlock AI Tools"
            tone="warning"
            action={{
              content: "Connect Google Ads",
              url: "/app/connect-google",
            }}
          >
            <p>
              AI ad copy generation and competitor insights require an active
              Google Ads connection. Head to Settings to connect your account.
            </p>
          </Banner>
        </BlockStack>
      </Page>
    );
  }

  return (
    <Page title="AI Tools">
      <BlockStack gap="400">
        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          {selectedTab === 0 && (
            <div style={{ paddingTop: "16px" }}>
              <AIContentStudio
                shopName={shopName}
                hasFeatureAccess={hasAiAccess}
              />
            </div>
          )}

          {selectedTab === 1 && (
            <div style={{ paddingTop: "16px" }}>
              {isProfessionalPlus ? (
                <CompetitorIntel shopName={shopName} data={competitorData as any} />
              ) : (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      Competitor Insights
                    </Text>
                    <Badge tone="attention">Professional Plan Required</Badge>
                    <Text variant="bodyMd" as="p">
                      Competitor Insights is available on Professional and
                      Enterprise plans.
                    </Text>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      See who's competing for your keywords, their impression
                      share, and positioning. Understand competitor ad strategies
                      and find gaps you can exploit.
                    </Text>
                    <Button url={planSelectionUrl} variant="primary">
                      Upgrade Plan
                    </Button>
                  </BlockStack>
                </Card>
              )}
            </div>
          )}
        </Tabs>
      </BlockStack>
    </Page>
  );
}
