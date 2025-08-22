import * as React from "react";
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import {
  useLoaderData,
  useNavigation,
  useSearchParams,
  Link,
  useFetcher,
  useRevalidator,
} from "@remix-run/react";
import { checkTenantSetup } from "../utils/tenant.server";

// Simplified chart component to avoid lazy loading issues
function SimpleChart({ data }: { data: any[] }) {
  if (!data?.length)
    return (
      <div
        style={{
          height: 180,
          border: "1px solid #eee",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
        No data
      </div>
    );
  return (
    <div
      style={{
        height: 180,
        border: "1px solid #eee",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
      }}
    >
      Chart: {data.length} points
    </div>
  );
}

export async function loader(args: LoaderFunctionArgs) {
  try {
    // Get shop name from Shopify authentication
    const { authenticate, extractShopFromRequest } = await import("../shopify.server");
    let shopName = extractShopFromRequest(args.request) || "";
    if (!shopName) {
      const auth = await authenticate.admin(args.request);
      if (auth instanceof Response) {
        return auth;
      }
      const { session } = auth as any;
      shopName = session?.shop?.replace(".myshopify.com", "") || "";
    }

    if (!shopName) {
      console.error("Loader error: No valid shop name found - setup required");
      throw new Error("No valid shop name found - setup required");
    }

    // Skip setup check for now to avoid redirect loops in serverless
    // TODO: Re-enable setup flow once serverless storage is working properly

    const url = new URL(args.request.url);
    const w = url.searchParams.get("w") === "24h" ? "24h" : "7d";
    const { backendFetch } = await import("../server/hmac.server");
    const r = await backendFetch(
      `/insights?w=${w}`,
      "GET",
      undefined,
      shopName,
    );
    const logs = await backendFetch(
      `/run-logs?limit=10`,
      "GET",
      undefined,
      shopName,
    );
    const base = {
      ok: false,
      w,
      kpi: {
        clicks: 0,
        cost: 0,
        conversions: 0,
        impressions: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
      },
      top_terms: [],
      series: [],
      explain: [],
      logs: [],
    };
    const merged = r?.json?.ok
      ? { ...r.json, logs: logs.json?.rows || [] }
      : base;
    return json(merged);
  } catch (error) {
    console.error("Insights loader error:", error);
    throw error;
  }
}

// Error boundary component
class InsightsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Insights page error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 20,
            border: "1px solid #f56565",
            borderRadius: 8,
            backgroundColor: "#fed7d7",
          }}
        >
          <h2>Something went wrong</h2>
          <p>
            The insights page encountered an error. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 10, padding: "8px 16px" }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function InsightsContent() {
  const data = useLoaderData<typeof loader>() as any;
  const [sp] = useSearchParams();
  const nav = useNavigation();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [toast, setToast] = React.useState<string>("");
  const [isApplying, setIsApplying] = React.useState<boolean>(false);

  // Safe data extraction with proper null checks
  const w = React.useMemo(() => {
    try {
      return sp.get("w") === "24h" ? "24h" : data?.w || "7d";
    } catch {
      return "7d";
    }
  }, [sp, data]);

  const k = React.useMemo(
    () =>
      data?.kpi || {
        clicks: 0,
        cost: 0,
        conversions: 0,
        impressions: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
      },
    [data],
  );
  const terms = React.useMemo(
    () => (Array.isArray(data?.top_terms) ? data.top_terms : []),
    [data],
  );
  const series = React.useMemo(
    () => (Array.isArray(data?.series) ? data.series : []),
    [data],
  );
  const explain = React.useMemo(
    () => (Array.isArray(data?.explain) ? data.explain : []),
    [data],
  );
  const logs = React.useMemo(
    () => (Array.isArray(data?.logs) ? data.logs : []),
    [data],
  );

  // Move onApply outside of render loop to prevent infinite re-renders
  const handleApplyAction = React.useCallback(
    async (action: string, target?: string) => {
      if (isApplying) return;

      setIsApplying(true);
      try {
        const { backendFetch } = await import("../server/hmac.server");
        const body: any = { nonce: Date.now(), actions: [] as any[] };

        if (action === "add_exact_negative" && target) {
          body.actions.push({ type: "add_exact_negative", target });
        } else if (action === "lower_cpc_ceiling") {
          const cur = Number(k?.cpc || 0);
          const newCpc = Math.max(
            0,
            isFinite(cur) && cur > 0 ? cur * 0.8 : 0.15,
          );
          body.actions.push({
            type: "lower_cpc_ceiling",
            campaign: "*",
            amount: Number(newCpc.toFixed(2)),
          });
        } else {
          setToast("Invalid action");
          return;
        }

        const r = await backendFetch("/insights/actions/apply", "POST", body);
        setToast(r?.json?.ok ? "Action applied" : "Action failed");

        // Instead of mutating data, revalidate the loader data
        revalidator.revalidate();
      } catch (error) {
        console.error("Error applying action:", error);
        setToast("Action failed - network error");
      } finally {
        setIsApplying(false);
      }
    },
    [isApplying, k, revalidator],
  );

  // Clear toast after 3 seconds
  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  return (
    <div>
      <h1
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Insights</span>
        <span style={{ display: "inline-flex", gap: 8 }}>
          <Link to="/app/insights?w=7d">
            <button disabled={w === "7d" || nav.state !== "idle"}>7d</button>
          </Link>
          <Link to="/app/insights?w=24h">
            <button disabled={w === "24h" || nav.state !== "idle"}>24h</button>
          </Link>
        </span>
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,minmax(0,1fr))",
          gap: 12,
        }}
      >
        <Card label="Clicks" value={k.clicks} />
        <Card label="Cost" value={fmt(k.cost)} />
        <Card label="Conv." value={k.conversions} />
        <Card label="Impr." value={k.impressions} />
        <Card label="CTR" value={pct(k.ctr)} />
        <Card label="CPC" value={fmt(k.cpc)} />
        <Card label="CPA" value={fmt(k.cpa)} />
      </div>
      <h3 style={{ marginTop: 16 }}>Trend ({w})</h3>
      <SimpleChart data={series} />
      <h3
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Top search terms ({w})</span>
        <Link to={`/app/insights/terms?w=${w}`}>
          <button>View all terms</button>
        </Link>
      </h3>
      <h3 style={{ marginTop: 16 }}>Activity (last 10)</h3>
      <ul>
        {logs.map((l: any, i: number) => {
          if (!l || typeof l !== "object") return null;
          return (
            <li key={`log-${i}-${l.timestamp || i}`}>
              <code>{l.timestamp || "No timestamp"}</code> —{" "}
              {l.message || "No message"}
            </li>
          );
        })}
        {!logs.length && <li>No recent activity.</li>}
      </ul>
      <table
        cellPadding={6}
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th align="left">Term</th>
            <th align="right">Clicks</th>
            <th align="right">Cost</th>
            <th align="right">Conv.</th>
          </tr>
        </thead>
        <tbody>
          {terms.map((t: any, i: number) => {
            if (!t || typeof t !== "object") return null;
            return (
              <tr key={`term-${i}-${t.term || i}`}>
                <td>{t.term || "Unknown term"}</td>
                <td align="right">{t.clicks || 0}</td>
                <td align="right">{fmt(t.cost)}</td>
                <td align="right">{t.conversions || 0}</td>
              </tr>
            );
          })}
          {!terms.length && (
            <tr>
              <td colSpan={4}>Not enough data yet.</td>
            </tr>
          )}
        </tbody>
      </table>
      <h3 style={{ marginTop: 16 }}>Explain my spend</h3>
      <ul>
        {explain.map((e: any, i: number) => {
          if (!e || typeof e !== "object") return null;

          const disabled = fetcher.state !== "idle" || isApplying;

          return (
            <li
              key={`explain-${i}-${e.action}-${e.target}`}
              style={{
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                <b>{e.label || "Unknown"}</b> —{" "}
                {e.reason || "No reason provided"}. Suggest:{" "}
                <code>{e.action || "none"}</code>
                {e.target ? ` (${e.target})` : ""}
              </span>
              <button
                onClick={() => handleApplyAction(e.action, e.target)}
                disabled={disabled}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #eee",
                  borderRadius: 6,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                {isApplying ? "Applying..." : "Apply"}
              </button>
            </li>
          );
        })}
        {!explain.length && <li>No high-confidence suggestions yet.</li>}
      </ul>
      {!!toast && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            opacity: 0.8,
            padding: "6px 12px",
            borderRadius: 4,
            backgroundColor: toast.includes("failed") ? "#fed7d7" : "#c6f6d5",
            border: toast.includes("failed")
              ? "1px solid #f56565"
              : "1px solid #38a169",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default function Insights() {
  return (
    <InsightsErrorBoundary>
      <InsightsContent />
    </InsightsErrorBoundary>
  );
}

function Card({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value ?? "—"}</div>
    </div>
  );
}
function fmt(n: number) {
  return typeof n === "number" ? `$${n.toFixed(2)}` : "—";
}
function pct(n: number) {
  return typeof n === "number" ? `${(n * 100).toFixed(2)}%` : "—";
}
