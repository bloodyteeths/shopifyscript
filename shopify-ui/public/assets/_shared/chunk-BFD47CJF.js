import {
  useLocation
} from "/assets/_shared/chunk-APMZZZMT.js";
import {
  createHotContext
} from "/assets/_shared/chunk-GN6N4SDD.js";

// app/utils/navigation.tsx
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/utils/navigation.tsx"
  );
  import.meta.hot.lastModified = "1758229076618.3833";
}
function useShopContext() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const urlShop = searchParams.get("shop");
  const urlHost = searchParams.get("host");
  let fallbackShop = null;
  if (typeof window !== "undefined") {
    const shopElement = document.getElementById("__shop");
    fallbackShop = shopElement?.getAttribute("data-shop-name");
  }
  return {
    shop: urlShop || (fallbackShop ? `${fallbackShop}.myshopify.com` : null),
    host: urlHost,
    embedded: searchParams.get("embedded"),
    hmac: searchParams.get("hmac"),
    session: searchParams.get("session"),
    id_token: searchParams.get("id_token"),
    timestamp: searchParams.get("timestamp"),
    locale: searchParams.get("locale")
  };
}
function buildAppUrl(path, shopContext) {
  if (!shopContext) {
    return path;
  }
  const url = new URL(path, "https://example.com");
  const criticalParams = ["shop", "host", "embedded", "hmac", "session"];
  criticalParams.forEach((key) => {
    const value = shopContext[key];
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  Object.entries(shopContext).forEach(([key, value]) => {
    if (value && !criticalParams.includes(key)) {
      url.searchParams.set(key, value);
    }
  });
  return `${url.pathname}${url.search}`;
}

export {
  useShopContext,
  buildAppUrl
};
//# sourceMappingURL=/assets/_shared/chunk-BFD47CJF.js.map
