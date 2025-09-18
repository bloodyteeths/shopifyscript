import React from "react";
import type { EntryContext } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { renderToString } from "react-dom/server";

// Comprehensive error tracking for serverless debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION DETECTED:');
  console.error('Promise:', promise);
  console.error('Reason type:', typeof reason);
  console.error('Reason:', reason);
  console.error('Stack trace:', reason?.stack || 'No stack trace');
  console.error('String representation:', String(reason));
  
  // Try to extract more info if it's a function
  if (typeof reason === 'function') {
    console.error('Function name:', reason.name);
    console.error('Function toString:', reason.toString().substring(0, 200));
  }
  
  // Don't exit the process in serverless environment
});

process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
});

console.log('🔍 Error handlers registered in entry.server.tsx');

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
    // Prevent stale HTML -> stale manifest causing 404s on route chunks
    headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    return new Response("<!DOCTYPE html>" + markup, { status, headers });
  } catch (err: any) {
    try {
      console.error("SSR error details:", {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        cause: err?.cause,
        fullError: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      });
    } catch (logErr) {
      console.error("SSR error (fallback):", String(err));
    }
    const body =
      "<!DOCTYPE html><html><body><h1>Server Error</h1></body></html>";
    headers.set("Content-Type", "text/html");
    headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    return new Response(body, { status: 500, headers });
  }
}
