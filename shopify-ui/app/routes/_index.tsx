import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // For embedded Shopify apps, always redirect to app route
  // Let the app route handle authentication via Shopify App Remix boundaries
  return redirect("/app/");
}

export default function Index() {
  return null;
}
