import compression from 'compression'
import express from 'express'
import morgan from 'morgan'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequestHandler } from '@remix-run/express'
import { createProxyMiddleware } from 'http-proxy-middleware'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MODE = process.env.NODE_ENV || 'production'
const SERVER_BUILD_PATH = path.join(__dirname, '..', 'build', 'index.js')
const PUBLIC_DIR = path.join(__dirname, '..', 'public')

const app = express()
app.disable('x-powered-by')
app.use(compression())
app.use(morgan('tiny'))

// Health endpoints
app.get('/health', (_req, res) => res.status(200).json({ ok: true }))
app.get('/_health', (_req, res) => res.status(200).json({ ok: true }))

// Serve hashed build assets
app.use(
  '/build',
  express.static(path.join(PUBLIC_DIR, 'build'), { immutable: true, maxAge: '1y' })
)

// Other static files in /public (e.g., CSS)
app.use(express.static(PUBLIC_DIR, { maxAge: '1h' }))

// Silence Chrome DevTools /.well-known noise
app.get('/.well-known/*', (_req, res) => res.sendStatus(404))

// Proxy API to backend
const rawBackendBase = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001'
// ensure target has no trailing slash or trailing /api to avoid /api/api
const backendBase = rawBackendBase.replace(/\/$/, '').replace(/\/api$/, '')
app.use(
  '/api',
  createProxyMiddleware({
    target: backendBase,
    changeOrigin: true,
    logLevel: 'warn',
    onProxyReq: (proxyReq, req) => {
      if (process.env.NODE_ENV !== 'production') {
        // helpful trace in UI logs
        try { console.log(`[ui->backend] ${req.method} ${req.originalUrl} → ${backendBase}`) } catch {}
      }
    }
  })
)

// Remix request handler
app.all(
  '*',
  createRequestHandler({
    build: await import(SERVER_BUILD_PATH),
    mode: MODE
  })
)

const port = Number(process.env.PORT || 3037)
app.listen(port, () => {
  console.log(`Proofkit UI (express) at http://localhost:${port}`)
})


