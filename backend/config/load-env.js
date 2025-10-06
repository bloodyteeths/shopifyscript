/**
 * Environment Configuration Loader
 * MUST be imported first before any other modules
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config();

// Load backend/.env
try {
  const backendEnv = path.resolve(__dirname, '..', '.env');
  dotenv.config({ path: backendEnv });
} catch (error) {
  // Silently fail if backend/.env doesn't exist
}

// Env alias normalization (Vercel-friendly)
if (!process.env.GOOGLE_SERVICE_EMAIL && process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
  process.env.GOOGLE_SERVICE_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
}
if (!process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
  process.env.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
}
if (!process.env.SHEET_ID && process.env.GOOGLE_SHEETS_PROJECT_ID) {
  process.env.SHEET_ID = process.env.GOOGLE_SHEETS_PROJECT_ID;
}

export default {
  loaded: true,
  timestamp: new Date().toISOString()
};
