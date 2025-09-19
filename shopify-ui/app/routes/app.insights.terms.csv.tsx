import { type LoaderFunctionArgs } from "@remix-run/node";
import { backendFetchRaw } from "../server/hmac.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const resp = await backendFetchRaw(`/insights/terms.csv?${qs}`, "GET");
  const buf = await resp.arrayBuffer();
  return new Response(Buffer.from(buf), {
    status: resp.status,
    headers: {
      "Content-Type":
        resp.headers.get("Content-Type") || "text/csv; charset=utf-8",
      "Content-Disposition":
        resp.headers.get("Content-Disposition") ||
        'attachment; filename="terms.csv"',
    },
  });
}
