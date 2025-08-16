import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../services/auth.server';
import IntentOS from '../components/IntentOS';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Get tenant ID from session/shop
  const tenantId = session.shop;
  
  // Check if PROMOTE flag is enabled for this tenant
  const promoteEnabled = process.env.INTENT_OS_GLOBAL_PROMOTE === 'true' || 
                        session.accessToken?.includes('intent_os_promote'); // Simplified check
  
  return json({
    tenantId,
    promoteEnabled,
    shopDomain: session.shop,
  });
};

export default function IntentOSPage() {
  const { tenantId, promoteEnabled, shopDomain } = useLoaderData<typeof loader>();

  return (
    <IntentOS 
      tenantId={tenantId}
      promoteEnabled={promoteEnabled}
    />
  );
}