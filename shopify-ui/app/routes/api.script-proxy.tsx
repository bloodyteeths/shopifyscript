import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { backendFetch } from "../server/hmac.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const result = await backendFetch("/ads-script/raw", "GET");

    if (result.json?.ok) {
      return json({
        ok: true,
        script: result.json.code || result.json.script || "",
      });
    } else {
      return json({
        ok: false,
        error: result.json?.error || "Failed to fetch script",
      });
    }
  } catch (error) {
    return json({
      ok: false,
      error: error.message || "Script proxy error",
    });
  }
};
