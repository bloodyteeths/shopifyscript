import * as React from "react";
import { useLoaderData } from "@remix-run/react";
import {
  json,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { checkSubscriptionStatus, hasFeatureAccess } from "../utils/subscription.server";
import { AIDashboard } from "../components/AIDashboard";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Standard Shopify authentication following best practices
    const { session, admin } = await authenticate.admin(request);

    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }

    console.log(`AI Dashboard loaded for shop: ${shopName}`);

    // Check subscription status for feature access control
    let subscriptionInfo: any = {
      hasActivePayment: false,
      isInTrial: false,
      trialDaysRemaining: null,
      subscriptionTier: null,
      subscriptionStatus: 'checking',
      subscriptionId: null,
      currentPeriodEnd: null,
      needsSubscription: true
    };

    let availableFeatures = {
      aiDashboard: true, // Allow basic dashboard access
      advancedAIWriter: false,
      aiAnalytics: false,
      customAIRules: false
    };

    try {
      subscriptionInfo = await checkSubscriptionStatus(admin);

      // Determine available features based on subscription
      availableFeatures = {
        aiDashboard: hasFeatureAccess(subscriptionInfo, 'ai_campaign_optimization'),
        advancedAIWriter: hasFeatureAccess(subscriptionInfo, 'advanced_ai_optimization'),
        aiAnalytics: hasFeatureAccess(subscriptionInfo, 'real_time_performance_analytics'),
        customAIRules: hasFeatureAccess(subscriptionInfo, 'custom_ai_optimization_rules')
      };

      console.log(`🤖 AI feature access for ${shopName}:`, availableFeatures);

    } catch (subscriptionError) {
      console.error('Subscription check failed on AI dashboard, using basic access:', subscriptionError);
      // Allow basic access if subscription check fails
    }

    return json({
      shopName,
      subscriptionInfo,
      availableFeatures
    });

  } catch (authError) {
    console.error("AI Dashboard authentication error:", authError);
    console.error("Request URL:", request.url);

    // Redirect to auth with shop context if possible
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop') || url.searchParams.get('host');
    const authUrl = shop ? `/auth/login?shop=${shop}` : '/auth/login';

    throw new Response(null, {
      status: 302,
      headers: { Location: authUrl }
    });
  }
}

export default function AIDashboardPage() {
  const { shopName, subscriptionInfo, availableFeatures } = useLoaderData<typeof loader>();

  return (
    <div>
      {/* Trial status banner */}
      {subscriptionInfo?.isInTrial && (
        <div style={{
          backgroundColor: (subscriptionInfo.trialDaysRemaining || 0) <= 3 ? '#fff4e5' : '#e8f5e9',
          border: (subscriptionInfo.trialDaysRemaining || 0) <= 3 ? '1px solid #ff9800' : '1px solid #4caf50',
          borderRadius: '6px',
          padding: '14px',
          margin: '12px 0'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            <strong>{(subscriptionInfo.trialDaysRemaining || 0) <= 3 ? 'Trial Ending Soon' : 'Free Trial Active'}:</strong>
            {' '}Your trial ends in {subscriptionInfo.trialDaysRemaining} day(s).
            {' '}Manage your subscription to avoid interruption.
          </p>
          <a
            href="/app/billing"
            style={{
              backgroundColor: (subscriptionInfo.trialDaysRemaining || 0) <= 3 ? '#ff9800' : '#4caf50',
              color: 'white',
              padding: '8px 14px',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '8px'
            }}
          >
            Manage Subscription
          </a>
        </div>
      )}

      {/* No subscription banner */}
      {!subscriptionInfo?.hasActivePayment && !subscriptionInfo?.isInTrial && (
        <div style={{
          backgroundColor: '#fff8e1',
          border: '1px solid #ffca28',
          borderRadius: '6px',
          padding: '14px',
          margin: '12px 0'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            <strong>Start Your Free Trial:</strong>
            {' '}Get full access to Ads Autopilot AI for 14 days. No commitment.
          </p>
          <a
            href="/app/billing"
            style={{
              backgroundColor: '#ffb300',
              color: 'white',
              padding: '8px 14px',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '8px'
            }}
          >
            Start Free Trial
          </a>
        </div>
      )}
      {/* Subscription tier notice for limited access */}
      {!availableFeatures.aiDashboard && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '6px',
          padding: '16px',
          margin: '16px 0',
          color: '#d97706'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
            Limited Access
          </h3>
          <p style={{ margin: '0 0 12px 0' }}>
            Your {subscriptionInfo.subscriptionTier || 'starter'} plan has limited AI dashboard features.
            Upgrade to Professional for full AI capabilities.
          </p>
          <a
            href="/app/billing"
            style={{
              backgroundColor: '#d97706',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Upgrade Now
          </a>
        </div>
      )}

      {/* Advanced features notice */}
      {availableFeatures.aiDashboard && !availableFeatures.advancedAIWriter && (
        <div style={{
          backgroundColor: '#e6f3ff',
          border: '1px solid #b3d9ff',
          borderRadius: '6px',
          padding: '16px',
          margin: '16px 0',
          color: '#0c5460'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
            AI Dashboard Available
          </h3>
          <p style={{ margin: '0 0 12px 0' }}>
            You have access to basic AI features. Upgrade to Professional+ for advanced AI automation and analytics.
          </p>
          <a
            href="/app/billing"
            style={{
              backgroundColor: '#0c5460',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            View Plans
          </a>
        </div>
      )}

      <AIDashboard
        shopName={shopName}
        subscriptionTier={subscriptionInfo.subscriptionTier || 'starter'}
        hasFeatureAccess={availableFeatures.advancedAIWriter}
      />
    </div>
  );
}
