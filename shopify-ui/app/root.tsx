import * as React from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, NavLink } from '@remix-run/react';
import type { LinksFunction } from '@remix-run/node';
import polarisStyles from '@shopify/polaris/build/esm/styles.css';
import { AppProvider } from '@shopify/polaris';
// Avoid importing JSON locales on Node 22 without import attributes; use empty i18n
const en: any = {};

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: polarisStyles },
];

export default function App(){
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider i18n={en}>
          <div className="Polaris-Page" style={{ display:'flex', minHeight:'100vh' }}>
            <nav style={{ width:240, padding:16, borderRight:'1px solid var(--p-color-border)' }}>
              <h3 style={{ marginBottom:12 }}>Proofkit</h3>
              <ul style={{ listStyle:'none', padding:0, display:'grid', gap:8 }}>
                <li><NavLink to="/app/autopilot">Autopilot</NavLink></li>
                <li><NavLink to="/app/insights">Insights</NavLink></li>
              </ul>
            </nav>
            <main style={{ flex:1, padding:24 }}>
              <Outlet />
            </main>
          </div>
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary(){
  return <pre style={{padding:16, color:'#a00'}}>Something went wrong. Check the console for details.</pre>;
}


