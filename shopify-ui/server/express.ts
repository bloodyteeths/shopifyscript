import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequestHandler } from '@remix-run/express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODE = process.env.NODE_ENV || 'production';
const SERVER_BUILD_PATH = path.join(__dirname, '..', 'build', 'index.js');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use(morgan('tiny'));

// health endpoints
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
app.get('/_health', (_req, res) => res.status(200).json({ ok: true }));

// static assets (client bundle) – served from public/build
app.use('/build', express.static(path.join(PUBLIC_DIR, 'build'), { immutable: true, maxAge: '1y' }));
// other static files in /public (e.g., CSS)
app.use(express.static(PUBLIC_DIR, { maxAge: '1h' }));

// remix request handler
app.all(
  '*',
  createRequestHandler({
    build: await import(SERVER_BUILD_PATH),
    mode: MODE
  })
);

const port = Number(process.env.PORT || 3037);
app.listen(port, () => {
  console.log(`Proofkit UI (express) at http://localhost:${port}`);
});


