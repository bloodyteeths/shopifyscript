import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { backendFetch } from "../server/hmac.server";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shopName = session?.shop?.replace(".myshopify.com", "");

    if (!shopName) {
      return json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const url = formData.get("url") as string;

    if (!url) {
      return json(
        { ok: false, error: "URL is required" },
        { status: 400 },
      );
    }

    const res = await backendFetch(
      "/google-ads/campaigns/analyze-url",
      "POST",
      { url, nonce: Date.now() },
      shopName,
    );

    if (res.status >= 200 && res.status < 300 && res.json?.ok) {
      return json({ ok: true, suggestions: res.json.suggestions });
    }

    return json({
      ok: false,
      error: res.json?.error || "Analysis failed. You can still fill in fields manually.",
    });
  } catch (error) {
    console.error("Campaign analyze error:", error);
    return json(
      { ok: false, error: "Failed to analyze URL. You can still fill in fields manually." },
      { status: 500 },
    );
  }
}
