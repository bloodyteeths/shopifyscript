import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../services/auth.server";
import IntentOS from "../components/IntentOS";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Simplified auth for demo - get tenant from URL or default
  const url = new URL(request.url);
  const tenantId =
    url.searchParams.get("tenant") || process.env.TENANT_ID || "proofkit";

  // Check if PROMOTE flag is enabled for this tenant
  const promoteEnabled = process.env.INTENT_OS_GLOBAL_PROMOTE === "true";

  return json({
    tenantId,
    promoteEnabled,
    shopDomain: "demo-shop.myshopify.com",
  });
};

export default function IntentOSPage() {
  const { tenantId, promoteEnabled, shopDomain } =
    useLoaderData<typeof loader>();

  return <IntentOS tenantId={tenantId} promoteEnabled={promoteEnabled} />;
}
