import * as React from 'react'
import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form, useNavigation, useActionData } from '@remix-run/react'
import { authenticate } from '../shopify.server'
import { getTenantFromRequest, checkTenantSetup } from '../utils/tenant.server'
import { markSetupCompleted, setTenantSetting, setTenantSheetId } from '../utils/database.server'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace('.myshopify.com', '') || '';
    
    if (!shopName) {
      throw new Error('Unable to determine shop name from Shopify session');
    }

    // If already setup, redirect to main app
    if (await checkTenantSetup(shopName)) {
      return redirect('/app');
    }

    return json({
      shopName,
      shopDomain: session?.shop || `${shopName}.myshopify.com`
    });
  } catch (error) {
    console.error('Setup loader error:', error);
    throw error;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace('.myshopify.com', '') || '';
    
    if (!shopName) {
      throw new Error('Unable to determine shop name from Shopify session');
    }

    // Simply mark setup as completed - no configuration needed
    await markSetupCompleted(shopName);

    console.log(`✅ Setup completed for tenant: ${shopName}`);

    return redirect('/app');
  } catch (error) {
    console.error('Setup action error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}

export default function Setup() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle';

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 16px 0', fontSize: '28px', color: '#333' }}>
          🎉 Welcome to ProofKit!
        </h1>
        <p style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#666' }}>
          Setting up for: <strong>{data.shopDomain}</strong>
        </p>
        <p style={{ margin: '0', fontSize: '14px', color: '#888' }}>
          This quick setup will only take 2 minutes
        </p>
      </div>

      {actionData?.error && (
        <div style={{
          backgroundColor: '#fed7d7',
          border: '1px solid #f56565',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          color: '#c53030'
        }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Setup Error</h4>
          <p style={{ margin: 0 }}>{actionData.error}</p>
        </div>
      )}

      <Form method="post" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Welcome Message */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e1e5e9',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '500px',
          marginBottom: '32px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚀</div>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: '#333' }}>
            You're All Set!
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '16px', color: '#666', lineHeight: '1.5' }}>
            ProofKit is now connected to your <strong>{data.shopDomain}</strong> store.
            <br />
            Your AI-powered Google Ads optimization is ready to begin!
          </p>
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
            color: '#495057'
          }}>
            <strong>Next steps:</strong>
            <br />
            • Configure your campaign settings in Advanced Settings
            <br />
            • Set up your automation schedule
            <br />
            • Review performance insights as data flows in
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '16px 32px',
            backgroundColor: isSubmitting ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: isSubmitting ? 'none' : '0 4px 12px rgba(0, 123, 255, 0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          {isSubmitting ? '⏳ Loading...' : '🎯 Get Started'}
        </button>
      </Form>
    </div>
  );
}