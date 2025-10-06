import React, { useState } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  NavLink,
  useLocation,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import polarisStyles from "@shopify/polaris/build/esm/styles.css";
import { AppProvider } from "@shopify/polaris";
// import { useShopContext, buildAppUrl } from "./utils/navigation"; // Temporarily disabled for debugging
// Avoid importing JSON locales on Node 22 without import attributes; use empty i18n
const en: any = {};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
];

export default function App() {
  
  // let shopContext;
  // try {
  //   shopContext = useShopContext();
  //   console.log('✅ Shop context loaded');
  // } catch (error) {
  //   console.error('❌ Shop context error:', error);
  //   shopContext = null;
  // }
  const shopContext = null; // Temporarily disabled for debugging
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Handle unhandled promise rejections globally to prevent serverless crashes
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Prevent the default behavior which crashes the Node.js process
      event.preventDefault();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      // Error handlers registered
      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);
  
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <style dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 768px) {
              .mobile-nav {
                position: fixed;
                top: 0;
                left: -100%;
                width: 280px;
                height: 100vh;
                z-index: 1000;
                transition: left 0.3s ease;
                box-shadow: 2px 0 10px rgba(0,0,0,0.1);
              }
              .mobile-nav.open {
                left: 0;
              }
              .mobile-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 999;
                display: none;
              }
              .mobile-overlay.open {
                display: block;
              }
              .desktop-nav {
                display: none;
              }
              .mobile-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px;
                background: #fafbfc;
                border-bottom: 1px solid #e1e3e5;
              }
              .hamburger {
                display: block;
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                padding: 8px;
                border-radius: 4px;
                transition: background-color 0.2s ease;
              }
              .hamburger:hover {
                background-color: #f1f2f3;
              }
              .main-content-mobile {
                padding: 16px !important;
              }
            }
            @media (min-width: 769px) {
              .mobile-nav,
              .mobile-overlay,
              .mobile-header {
                display: none;
              }
              .hamburger {
                display: none;
              }
            }
          `
        }} />
      </head>
      <body>
        <AppProvider i18n={en}>
          <div
            className="Polaris-Page"
            style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}
          >
            {/* Mobile Header */}
            <div className="mobile-header">
              <button 
                className="hamburger"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                ☰
              </button>
              <h1 style={{ 
                fontSize: "18px", 
                fontWeight: "bold", 
                color: "#202223", 
                margin: 0 
              }}>
                Ads Autopilot AI
              </h1>
              <div style={{ width: 36 }}></div>
            </div>

            {/* Mobile Overlay */}
            <div
              className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              suppressHydrationWarning={true}
            />

            <div style={{ display: "flex", flex: 1 }}>
              {/* Desktop Navigation */}
              <nav
                className="desktop-nav"
                style={{
                  width: 240,
                  padding: 20,
                  borderRight: "1px solid var(--p-color-border)",
                  background: "#fafbfc",
                }}
              >
              <h3
                style={{
                  marginBottom: 20,
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#202223",
                  borderBottom: "1px solid #e1e3e5",
                  paddingBottom: 12,
                }}
              >
                Ads Autopilot AI
              </h3>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  display: "grid",
                  gap: 4,
                }}
              >
                <li>
                  <NavLink
                    to="/app/"
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#202223",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/autopilot"
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#202223",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Autopilot
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/advanced"
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#202223",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Advanced
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/ai-dashboard"
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#202223",
                      transition: "all 0.2s ease",
                    }}
                  >
                    AI Dashboard
                  </NavLink>
                </li>
                <li
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid #e1e3e5",
                  }}
                >
                  <NavLink
                    to="/app/intent-os"
                    style={{
                      display: "block",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: "400",
                      color: "#6d7175",
                      opacity: 0.7,
                    }}
                  >
                    Smart Website
                    <br />
                    <span style={{ fontSize: "10px", color: "#8c9196" }}>
                      Coming Q1 2026
                    </span>
                  </NavLink>
                </li>
              </ul>
              </nav>

              {/* Mobile Navigation */}
              <nav
                className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}
                suppressHydrationWarning={true}
                style={{
                  width: 280,
                  padding: 20,
                  background: "#fafbfc",
                  borderRight: "1px solid var(--p-color-border)",
                }}
              >
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: "1px solid #e1e3e5"
                }}>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "#202223",
                      margin: 0,
                    }}
                  >
                    Ads Autopilot AI
                  </h3>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "18px",
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      color: "#6d7175"
                    }}
                    aria-label="Close navigation menu"
                  >
                    ✕
                  </button>
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <li>
                    <NavLink
                      to="/app/"
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "12px 16px",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontSize: "16px",
                        fontWeight: "500",
                        color: "#202223",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Dashboard
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/app/autopilot"
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "12px 16px",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontSize: "16px",
                        fontWeight: "500",
                        color: "#202223",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Autopilot
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/app/advanced"
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "12px 16px",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontSize: "16px",
                        fontWeight: "500",
                        color: "#202223",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Advanced
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/app/ai-dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "12px 16px",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontSize: "16px",
                        fontWeight: "500",
                        color: "#202223",
                        transition: "all 0.2s ease",
                      }}
                      >
                      AI Dashboard
                    </NavLink>
                  </li>
                  <li
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid #e1e3e5",
                    }}
                  >
                    <NavLink
                      to="/app/intent-os"
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "12px 16px",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontSize: "14px",
                        fontWeight: "400",
                        color: "#6d7175",
                        opacity: 0.7,
                      }}
                    >
                      Smart Website
                      <br />
                      <span style={{ fontSize: "12px", color: "#8c9196" }}>
                        Coming Q1 2026
                      </span>
                    </NavLink>
                  </li>
                </ul>
              </nav>

              <main 
                className="main-content-mobile"
                style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column" }}
              >
              <div style={{ flex: 1 }}>
                <Outlet />
              </div>
              <footer style={{ 
                marginTop: "auto",
                paddingTop: "24px",
                borderTop: "1px solid #e1e3e5",
                textAlign: "center",
                fontSize: "12px",
                color: "#6d7175"
              }}>
                <div style={{ marginBottom: "12px" }}>
                  <a 
                    href="/privacy" 
                    target="_blank"
                    style={{ 
                      color: "#006fbb", 
                      textDecoration: "none",
                      marginRight: "16px"
                    }}
                  >
                    Privacy Policy
                  </a>
                  <a 
                    href="/terms" 
                    target="_blank"
                    style={{ 
                      color: "#006fbb", 
                      textDecoration: "none",
                      marginRight: "16px"
                    }}
                  >
                    Terms of Service
                  </a>
                  <a 
                    href="/support" 
                    target="_blank"
                    style={{ 
                      color: "#006fbb", 
                      textDecoration: "none"
                    }}
                  >
                    Support
                  </a>
                </div>
                <div style={{ color: "#8c9196", fontSize: "11px" }}>
                  Ads Autopilot AI © 2024 • Contact: atanrikulu@e-listele.com
                </div>
              </footer>
              </main>
            </div>
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
