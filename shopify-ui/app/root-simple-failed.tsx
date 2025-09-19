import React from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  NavLink,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import polarisStyles from "@shopify/polaris/build/esm/styles.css";
import { AppProvider } from "@shopify/polaris";

const en: any = {};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider i18n={en}>
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <nav style={{
              width: 240,
              padding: 20,
              borderRight: "1px solid #e1e3e5",
              background: "#fafbfc",
            }}>
              <h3 style={{
                marginBottom: 20,
                fontSize: "18px",
                fontWeight: "bold",
                color: "#202223",
              }}>
                Ads Autopilot AI
              </h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: 8 }}>
                  <NavLink to="/app/" style={({ isActive }) => ({
                    display: "block",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#202223",
                    background: isActive ? "#f0f1f2" : "transparent",
                  })}>
                    Dashboard
                  </NavLink>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <NavLink to="/app/autopilot" style={({ isActive }) => ({
                    display: "block",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#202223",
                    background: isActive ? "#f0f1f2" : "transparent",
                  })}>
                    Autopilot
                  </NavLink>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <NavLink to="/app/insights" style={({ isActive }) => ({
                    display: "block",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#202223",
                    background: isActive ? "#f0f1f2" : "transparent",
                  })}>
                    Insights
                  </NavLink>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <NavLink to="/app/advanced" style={({ isActive }) => ({
                    display: "block",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#202223",
                    background: isActive ? "#f0f1f2" : "transparent",
                  })}>
                    Advanced
                  </NavLink>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <NavLink to="/app/billing" style={({ isActive }) => ({
                    display: "block",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#202223",
                    background: isActive ? "#f0f1f2" : "transparent",
                  })}>
                    Billing
                  </NavLink>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <NavLink to="/app/support" style={({ isActive }) => ({
                    display: "block",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#202223",
                    background: isActive ? "#f0f1f2" : "transparent",
                  })}>
                    Support
                  </NavLink>
                </li>
              </ul>
            </nav>
            <main style={{ flex: 1, padding: 24 }}>
              <Outlet />
              <footer style={{
                marginTop: 40,
                paddingTop: 20,
                borderTop: "1px solid #e1e3e5",
                textAlign: "center",
                fontSize: "12px",
                color: "#6d7175"
              }}>
                Ads Autopilot AI © 2024 • Contact: atanrikulu@e-listele.com
              </footer>
            </main>
          </div>
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return (
    <pre style={{ padding: 16, color: "#a00" }}>
      Something went wrong. Check the console for details.
    </pre>
  );
}