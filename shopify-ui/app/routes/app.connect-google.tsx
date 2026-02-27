import { useEffect, useState, useCallback } from "react";
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, useSearchParams } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
  InlineStack,
  Badge,
  Box,
  Spinner,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { backendFetch } from "../server/hmac.server";

/* ------------------------------------------------------------------ */
/*  Loader – check current Google Ads connection status               */
/* ------------------------------------------------------------------ */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      throw new Error("Unable to determine shop name from Shopify session");
    }

    // Check connection status from backend
    let connectionStatus: {
      connected: boolean;
      email?: string;
      accountId?: string;
      accountName?: string;
      error?: string;
    } = { connected: false };

    try {
      const res = await backendFetch(
        "/google-ads/connection-status",
        "GET",
        undefined,
        shopName,
      );

      if (res.status >= 200 && res.status < 300 && res.json) {
        connectionStatus = {
          connected: !!res.json.connected,
          email: res.json.email || undefined,
          accountId: res.json.accountId || res.json.account_id || undefined,
          accountName: res.json.accountName || res.json.account_name || undefined,
        };
      } else {
        console.warn(
          `Google Ads connection-status returned ${res.status}:`,
          res.json?.error,
        );
      }
    } catch (err) {
      console.error("Failed to check Google Ads connection status:", err);
    }

    return json({ shopName, connectionStatus });
  } catch (authError) {
    console.error("connect-google authentication error:", authError);
    const url = new URL(request.url);
    const shop =
      url.searchParams.get("shop") || url.searchParams.get("host");
    const authUrl = shop ? `/auth/login?shop=${shop}` : "/auth/login";
    throw new Response(null, {
      status: 302,
      headers: { Location: authUrl },
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Action – connect / disconnect / select-account                    */
/* ------------------------------------------------------------------ */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      return json({ success: false, error: "Authentication required" });
    }

    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    /* ---------- connect: get OAuth URL from backend ---------- */
    if (intent === "connect") {
      try {
        const res = await backendFetch(
          "/google-ads/auth/url",
          "POST",
          { nonce: Date.now() },
          shopName,
        );

        if (res.status >= 200 && res.status < 300 && res.json?.url) {
          return json({ success: true, authUrl: res.json.url });
        }

        return json({
          success: false,
          error:
            res.json?.error ||
            `Backend returned status ${res.status}`,
        });
      } catch (err) {
        console.error("Failed to get Google Ads auth URL:", err);
        return json({
          success: false,
          error: "Unable to start Google Ads authorization. Please try again.",
        });
      }
    }

    /* ---------- disconnect ---------- */
    if (intent === "disconnect") {
      try {
        const res = await backendFetch(
          "/google-ads/disconnect",
          "POST",
          { nonce: Date.now() },
          shopName,
        );

        if (res.status >= 200 && res.status < 300) {
          return json({ success: true, disconnected: true });
        }

        return json({
          success: false,
          error:
            res.json?.error ||
            `Disconnect failed with status ${res.status}`,
        });
      } catch (err) {
        console.error("Failed to disconnect Google Ads:", err);
        return json({
          success: false,
          error: "Unable to disconnect. Please try again.",
        });
      }
    }

    /* ---------- select-account ---------- */
    if (intent === "select-account") {
      const accountId = formData.get("accountId") as string;

      if (!accountId) {
        return json({
          success: false,
          error: "No account ID provided",
        });
      }

      try {
        const res = await backendFetch(
          "/google-ads/accounts/select",
          "POST",
          { accountId, nonce: Date.now() },
          shopName,
        );

        if (res.status >= 200 && res.status < 300) {
          return json({ success: true, accountSelected: true });
        }

        return json({
          success: false,
          error:
            res.json?.error ||
            `Account selection failed with status ${res.status}`,
        });
      } catch (err) {
        console.error("Failed to select Google Ads account:", err);
        return json({
          success: false,
          error: "Unable to select account. Please try again.",
        });
      }
    }

    return json({ success: false, error: "Unknown action" });
  } catch (authError) {
    console.error("connect-google action auth error:", authError);
    return json({
      success: false,
      error: "Authentication failed - please reload the page",
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ConnectGoogle() {
  const { shopName, connectionStatus } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const [searchParams] = useSearchParams();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [banner, setBanner] = useState<{
    tone: "success" | "critical" | "info" | "warning";
    message: string;
  } | null>(null);

  // Check URL params for callback status
  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  // Show banner from URL params (OAuth callback redirect)
  useEffect(() => {
    if (connectedParam === "true") {
      setBanner({
        tone: "success",
        message:
          "Google Ads account connected successfully! Your account is now linked.",
      });
    } else if (errorParam) {
      setBanner({
        tone: "critical",
        message: `Connection failed: ${decodeURIComponent(errorParam)}`,
      });
    }
  }, [connectedParam, errorParam]);

  // Handle action responses
  useEffect(() => {
    if (!actionData) return;

    const data = actionData as {
      success?: boolean;
      authUrl?: string;
      disconnected?: boolean;
      accountSelected?: boolean;
      error?: string;
    };

    if (data.authUrl) {
      // Redirect to Google OAuth — use _top to escape Shopify iframe
      window.open(data.authUrl, "_top");
      return;
    }

    if (data.disconnected) {
      setBanner({
        tone: "success",
        message: "Google Ads account disconnected.",
      });
      setIsDisconnecting(false);
      // Reload to refresh connection status
      window.location.reload();
      return;
    }

    if (data.accountSelected) {
      setBanner({
        tone: "success",
        message: "Google Ads account selected successfully.",
      });
      window.location.reload();
      return;
    }

    if (data.error) {
      setBanner({ tone: "critical", message: data.error });
      setIsConnecting(false);
      setIsDisconnecting(false);
    }
  }, [actionData]);

  /* ---------- handlers ---------- */

  const handleConnect = useCallback(() => {
    setIsConnecting(true);
    setBanner(null);
    const formData = new FormData();
    formData.set("intent", "connect");
    submit(formData, { method: "post" });
  }, [submit]);

  const handleDisconnect = useCallback(() => {
    setIsDisconnecting(true);
    setBanner(null);
    const formData = new FormData();
    formData.set("intent", "disconnect");
    submit(formData, { method: "post" });
  }, [submit]);

  /* ---------- render ---------- */

  return (
    <Page title="Connect Google Ads">
      <BlockStack gap="400">
        {/* Banners */}
        {banner && (
          <Banner
            tone={banner.tone}
            onDismiss={() => setBanner(null)}
          >
            <p>{banner.message}</p>
          </Banner>
        )}

        {/* ---- Connected state ---- */}
        {connectionStatus.connected ? (
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Google Ads Connection
                  </Text>
                  <Badge tone="success">Connected</Badge>
                </InlineStack>

                <Divider />

                <BlockStack gap="200">
                  {connectionStatus.email && (
                    <InlineStack gap="200">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        Google Account:
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {connectionStatus.email}
                      </Text>
                    </InlineStack>
                  )}

                  {connectionStatus.accountId && (
                    <InlineStack gap="200">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        Ads Account ID:
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {connectionStatus.accountId}
                      </Text>
                    </InlineStack>
                  )}

                  {connectionStatus.accountName && (
                    <InlineStack gap="200">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        Account Name:
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {connectionStatus.accountName}
                      </Text>
                    </InlineStack>
                  )}
                </BlockStack>

                <Divider />

                <InlineStack align="end">
                  <Button
                    variant="primary"
                    tone="critical"
                    loading={isDisconnecting}
                    onClick={handleDisconnect}
                  >
                    Disconnect Google Ads
                  </Button>
                </InlineStack>
              </BlockStack>
            </Box>
          </Card>
        ) : (
          /* ---- Not connected state ---- */
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Google Ads Connection
                  </Text>
                  <Badge tone="attention">Not Connected</Badge>
                </InlineStack>

                <Divider />

                <Text as="p" variant="bodyMd">
                  Connect your Google Ads account to enable automated campaign
                  optimization. Ads Autopilot will use the Google Ads API to
                  read performance data and apply bid adjustments on your
                  behalf.
                </Text>

                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    What happens when you connect:
                  </Text>
                  <Text as="p" variant="bodyMd">
                    1. You will be redirected to Google to authorize access.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    2. Select the Google Ads account you want to manage.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    3. Return here to confirm the connection.
                  </Text>
                </BlockStack>

                <Divider />

                <InlineStack align="end">
                  {isConnecting ? (
                    <InlineStack gap="200" blockAlign="center">
                      <Spinner size="small" />
                      <Text as="span" variant="bodyMd">
                        Preparing authorization...
                      </Text>
                    </InlineStack>
                  ) : (
                    <Button variant="primary" onClick={handleConnect}>
                      Connect Google Ads
                    </Button>
                  )}
                </InlineStack>
              </BlockStack>
            </Box>
          </Card>
        )}

        {/* Help card */}
        <Card>
          <Box padding="400">
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Need help?
              </Text>
              <Text as="p" variant="bodyMd">
                If you have trouble connecting your Google Ads account, make
                sure you are signing in with the Google account that has access
                to the Google Ads account you want to manage. Manager (MCC)
                accounts are also supported.
              </Text>
              <Text as="p" variant="bodyMd">
                After connecting, the app will only request the minimum
                permissions needed to read campaign performance data and adjust
                bids. You can revoke access at any time from this page or from
                your Google Account settings.
              </Text>
            </BlockStack>
          </Box>
        </Card>
      </BlockStack>
    </Page>
  );
}
