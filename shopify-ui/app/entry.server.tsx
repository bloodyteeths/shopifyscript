import * as React from "react";
import type { EntryContext } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { renderToString } from "react-dom/server";

export default function handleRequest(
  request: Request,
  status: number,
  headers: Headers,
  context: EntryContext,
) {
  try {
    const markup = renderToString(
      <RemixServer context={context} url={request.url} />,
    );
    headers.set("Content-Type", "text/html");
    return new Response("<!DOCTYPE html>" + markup, { status, headers });
  } catch (err: any) {
    try {
      console.error(
        "SSR error:",
        err && (err.stack || err.message || String(err)),
      );
    } catch {}
    const body =
      "<!DOCTYPE html><html><body><h1>Server Error</h1></body></html>";
    headers.set("Content-Type", "text/html");
    return new Response(body, { status: 500, headers });
  }
}
