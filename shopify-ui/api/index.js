import { createRequestHandler } from '@remix-run/express';
import compression from 'compression';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.disable('x-powered-by');
app.use(compression());

// Health endpoints
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
app.get('/_health', (_req, res) => res.status(200).json({ ok: true }));

// Favicon handler
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// Silence Chrome DevTools noise
app.get('/.well-known/*', (_req, res) => res.sendStatus(404));

// Proxy API to backend
const rawBackendBase = process.env.BACKEND_PUBLIC_URL || 'https://shopifyscript-backend.vercel.app';
const backendBase = rawBackendBase.replace(/\/$/, '').replace(/\/api$/, '');
app.use(
  '/api',
  createProxyMiddleware({
    target: backendBase,
    changeOrigin: true,
    logLevel: 'warn',
    onProxyReq: (proxyReq, req) => {
      if (process.env.NODE_ENV !== 'production') {
        try { console.log(`[ui->backend] ${req.method} ${req.originalUrl} → ${backendBase}`) } catch {}
      }
    }
  })
);

// Dynamic import for Remix handler
let remixHandler;

async function getRemixHandler() {
  if (!remixHandler) {
    try {
      // Use import for ESM build
      const build = await import('../build/index.js');
      remixHandler = createRequestHandler({
        build,
        mode: process.env.NODE_ENV || 'production'
      });
    } catch (error) {
      console.error('Failed to load Remix build:', error);
      return (req, res) => {
        res.status(500).json({ 
          error: 'Failed to load application', 
          message: 'Server configuration error' 
        });
      };
    }
  }
  return remixHandler;
}

// Remix request handler
app.all('*', async (req, res, next) => {
  try {
    const handler = await getRemixHandler();
    return handler(req, res, next);
  } catch (error) {
    console.error('Remix handler error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Unable to process request' 
    });
  }
});

export default app;