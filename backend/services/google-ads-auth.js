/**
 * Google Ads OAuth & Token Management Service
 * Handles the full OAuth2 flow for connecting Google Ads accounts,
 * token encryption/decryption, and automatic access token refresh.
 *
 * Features:
 * - OAuth2 consent URL generation with tenant state
 * - Authorization code exchange for tokens
 * - AES-256-GCM encryption of refresh tokens at rest
 * - Automatic access token refresh before expiry
 * - List accessible Google Ads customer accounts
 * - Account selection (supports MCC parent accounts)
 * - Graceful disconnect and status queries
 */

import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { GoogleAdsApi } from 'google-ads-api';
import { getSupabaseClient } from './supabase-client.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GOOGLE_ADS_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const GOOGLE_ADS_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const GOOGLE_ADS_OAUTH_CALLBACK_URL = process.env.GOOGLE_ADS_OAUTH_CALLBACK_URL;

const SCOPES = ['https://www.googleapis.com/auth/adwords'];

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = crypto.scryptSync(
  process.env.GOOGLE_ADS_TOKEN_ENCRYPTION_KEY || process.env.HMAC_SECRET,
  'google-ads-token-encryption-v1',
  32
);

if (!process.env.GOOGLE_ADS_TOKEN_ENCRYPTION_KEY && !process.env.HMAC_SECRET) {
  console.error('FATAL: Neither GOOGLE_ADS_TOKEN_ENCRYPTION_KEY nor HMAC_SECRET is set. Token encryption will fail.');
}

/**
 * Create a signed state parameter for OAuth to prevent CSRF.
 * Format: tenantId:timestamp:hmac
 */
function createSignedState(tenantId) {
  const timestamp = Date.now();
  const payload = `${tenantId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', process.env.HMAC_SECRET || '')
    .update(payload)
    .digest('hex')
    .substring(0, 16); // Short signature is sufficient for CSRF protection
  return `${payload}:${hmac}`;
}

/**
 * Verify and extract tenantId from a signed state parameter.
 * Returns null if the signature is invalid or the state has expired (1hr).
 */
function verifySignedState(state) {
  if (!state) return null;
  const parts = state.split(':');
  if (parts.length !== 3) return null;

  const [tenantId, timestamp, receivedHmac] = parts;
  const payload = `${tenantId}:${timestamp}`;
  const expectedHmac = crypto.createHmac('sha256', process.env.HMAC_SECRET || '')
    .update(payload)
    .digest('hex')
    .substring(0, 16);

  if (receivedHmac !== expectedHmac) return null;

  // Check expiry (1 hour)
  const age = Date.now() - parseInt(timestamp, 10);
  if (isNaN(age) || age > 3600000) return null;

  return tenantId;
}

// Token expiry buffer – refresh 5 minutes before actual expiry
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Create a configured OAuth2Client instance.
 */
function createOAuth2Client() {
  return new OAuth2Client(
    GOOGLE_ADS_CLIENT_ID,
    GOOGLE_ADS_CLIENT_SECRET,
    GOOGLE_ADS_OAUTH_CALLBACK_URL
  );
}

// ---------------------------------------------------------------------------
// 1. generateAuthUrl
// ---------------------------------------------------------------------------

/**
 * Generate the Google OAuth consent URL for a tenant.
 * The tenantId is encoded in the `state` parameter so the callback can
 * associate the resulting tokens with the correct tenant.
 *
 * @param {string} tenantId
 * @returns {string} The authorization URL to redirect the user to
 */
export function generateAuthUrl(tenantId) {
  const client = createOAuth2Client();

  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: createSignedState(tenantId),
  });

  console.log('🔗 Generated Google Ads auth URL for tenant:', tenantId);
  return url;
}

// ---------------------------------------------------------------------------
// 2. exchangeCodeForTokens
// ---------------------------------------------------------------------------

/**
 * Exchange an authorization code for access and refresh tokens.
 *
 * @param {string} code - The authorization code from the OAuth callback
 * @returns {Promise<{accessToken: string, refreshToken: string, expiresAt: Date}>}
 */
export async function exchangeCodeForTokens(code) {
  const client = createOAuth2Client();

  const { tokens } = await client.getToken(code);

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

  console.log('🔑 Exchanged auth code for tokens, expires at:', expiresAt.toISOString());

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
  };
}

// ---------------------------------------------------------------------------
// 3. encryptToken
// ---------------------------------------------------------------------------

/**
 * Encrypt a token string using AES-256-GCM.
 *
 * @param {string} token - The plaintext token to encrypt
 * @returns {{ encrypted: string, iv: string }} Hex-encoded ciphertext + authTag, and IV
 */
export function encryptToken(token) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted: encrypted + ':' + authTag,
    iv: iv.toString('hex'),
  };
}

// ---------------------------------------------------------------------------
// 4. decryptToken
// ---------------------------------------------------------------------------

/**
 * Decrypt an AES-256-GCM encrypted token.
 *
 * @param {string} encrypted - Hex-encoded ciphertext:authTag
 * @param {string} iv - Hex-encoded initialization vector
 * @returns {string} The decrypted plaintext token
 */
export function decryptToken(encrypted, iv) {
  const [ciphertext, authTagHex] = encrypted.split(':');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ---------------------------------------------------------------------------
// 5. saveConnection
// ---------------------------------------------------------------------------

/**
 * Encrypt the refresh token and upsert the connection into the
 * `google_ads_connections` table.
 *
 * @param {string} tenantId
 * @param {{ refreshToken: string, accessToken: string, expiresAt: Date, googleEmail: string }} params
 * @returns {Promise<object>} The upserted row
 */
export async function saveConnection(tenantId, { refreshToken, accessToken, expiresAt, googleEmail }) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { encrypted, iv } = encryptToken(refreshToken);

  const row = {
    tenant_id: tenantId,
    refresh_token_encrypted: encrypted,
    refresh_token_iv: iv,
    access_token: accessToken,
    access_token_expires_at: expiresAt.toISOString(),
    google_email: googleEmail,
    connection_status: 'active',
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('google_ads_connections')
    .upsert(row, { onConflict: 'tenant_id' })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to save Google Ads connection:', error.message);
    throw error;
  }

  console.log('💾 Saved Google Ads connection for tenant:', tenantId);
  return data;
}

// ---------------------------------------------------------------------------
// 6. getConnection
// ---------------------------------------------------------------------------

/**
 * Fetch and decrypt the Google Ads connection for a tenant.
 * Returns null if not found or if connection_status is 'disconnected'.
 *
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getConnection(tenantId) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase
    .from('google_ads_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return null;
  }

  if (data.connection_status === 'disconnected') {
    return null;
  }

  // Decrypt the refresh token
  let refreshToken = null;
  try {
    if (data.refresh_token_encrypted && data.refresh_token_iv) {
      refreshToken = decryptToken(data.refresh_token_encrypted, data.refresh_token_iv);
    }
  } catch (err) {
    console.error('❌ Failed to decrypt refresh token for tenant:', tenantId, err.message);
    return null;
  }

  return {
    tenantId: data.tenant_id,
    refreshToken,
    accessToken: data.access_token,
    tokenExpiresAt: data.access_token_expires_at ? new Date(data.access_token_expires_at) : null,
    googleEmail: data.google_email,
    customerId: data.customer_id || null,
    loginCustomerId: data.login_customer_id || null,
    connectionStatus: data.connection_status,
    connectedAt: data.connected_at,
  };
}

// ---------------------------------------------------------------------------
// 7. refreshAccessToken
// ---------------------------------------------------------------------------

/**
 * Use the stored refresh token to obtain a new access token.
 * Updates the database with the fresh access token and expiry.
 * If the refresh fails, marks the connection as 'token_expired'.
 *
 * @param {string} tenantId
 * @returns {Promise<string>} The new access token
 */
export async function refreshAccessToken(tenantId) {
  const connection = await getConnection(tenantId);
  if (!connection || !connection.refreshToken) {
    throw new Error(`No valid connection found for tenant: ${tenantId}`);
  }

  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: connection.refreshToken });

  try {
    const { credentials } = await client.refreshAccessToken();

    const newAccessToken = credentials.access_token;
    const newExpiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Update in database
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('google_ads_connections')
      .update({
        access_token: newAccessToken,
        access_token_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('❌ Failed to update refreshed token in DB:', error.message);
      throw error;
    }

    console.log('🔄 Refreshed access token for tenant:', tenantId);
    return newAccessToken;
  } catch (err) {
    console.error('❌ Token refresh failed for tenant:', tenantId, err.message);

    // Mark connection as expired so the user knows to re-authorize
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('google_ads_connections')
        .update({
          connection_status: 'token_expired',
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);
    } catch (updateErr) {
      console.error('❌ Failed to mark connection as token_expired:', updateErr.message);
    }

    throw new Error(`Token refresh failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// 8. getValidAccessToken
// ---------------------------------------------------------------------------

/**
 * Return a valid (non-expired) access token for a tenant.
 * If the cached token is still valid, returns it directly.
 * Otherwise refreshes automatically.
 *
 * @param {string} tenantId
 * @returns {Promise<string>} A valid access token
 */
export async function getValidAccessToken(tenantId) {
  const connection = await getConnection(tenantId);
  if (!connection) {
    throw new Error(`No Google Ads connection found for tenant: ${tenantId}`);
  }

  const now = new Date();
  const expiresAt = connection.tokenExpiresAt;

  // If we have a token and it won't expire within the buffer window, use it
  if (connection.accessToken && expiresAt && (expiresAt.getTime() - now.getTime()) > TOKEN_EXPIRY_BUFFER_MS) {
    return connection.accessToken;
  }

  // Otherwise refresh
  console.log('⏰ Access token expired or expiring soon for tenant:', tenantId);
  return refreshAccessToken(tenantId);
}

// ---------------------------------------------------------------------------
// 9. listAccessibleAccounts
// ---------------------------------------------------------------------------

/**
 * List all Google Ads customer accounts accessible with the given refresh token.
 * Uses the google-ads-api library's listAccessibleCustomers method.
 *
 * @param {string} refreshToken
 * @returns {Promise<string[]>} Array of customer IDs (numeric strings)
 */
export async function listAccessibleAccounts(refreshToken) {
  const client = new GoogleAdsApi({
    client_id: GOOGLE_ADS_CLIENT_ID,
    client_secret: GOOGLE_ADS_CLIENT_SECRET,
    developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
  });

  const resourceNames = await client.listAccessibleCustomers(refreshToken);

  // Resource names come in the format "customers/1234567890"
  const customerIds = resourceNames.map((name) => name.replace('customers/', ''));

  console.log('📋 Found', customerIds.length, 'accessible Google Ads accounts');
  return customerIds;
}

// ---------------------------------------------------------------------------
// 10. selectAccount
// ---------------------------------------------------------------------------

/**
 * Update the selected Google Ads customer ID for a tenant.
 * Optionally set a loginCustomerId for MCC (manager) parent accounts.
 *
 * @param {string} tenantId
 * @param {string} customerId - The Google Ads customer ID to use
 * @param {string|null} loginCustomerId - The MCC parent account ID (if applicable)
 * @returns {Promise<object>} The updated row
 */
export async function selectAccount(tenantId, customerId, loginCustomerId = null) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const updatePayload = {
    customer_id: customerId,
    login_customer_id: loginCustomerId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('google_ads_connections')
    .update(updatePayload)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to select Google Ads account:', error.message);
    throw error;
  }

  console.log('✅ Selected Google Ads account', customerId, 'for tenant:', tenantId);
  return data;
}

// ---------------------------------------------------------------------------
// 11. disconnect
// ---------------------------------------------------------------------------

/**
 * Disconnect a tenant's Google Ads account.
 * Sets connection_status to 'disconnected' and clears sensitive token data.
 *
 * @param {string} tenantId
 * @returns {Promise<void>}
 */
export async function disconnect(tenantId) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { error } = await supabase
    .from('google_ads_connections')
    .update({
      connection_status: 'disconnected',
      refresh_token_encrypted: null,
      refresh_token_iv: null,
      access_token: null,
      access_token_expires_at: null,
      customer_id: null,
      login_customer_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('❌ Failed to disconnect Google Ads for tenant:', tenantId, error.message);
    throw error;
  }

  console.log('🔌 Disconnected Google Ads for tenant:', tenantId);
}

// ---------------------------------------------------------------------------
// 12. getConnectionStatus
// ---------------------------------------------------------------------------

/**
 * Return the connection status and non-sensitive metadata for a tenant.
 * Never exposes tokens or encryption details.
 *
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
export async function getConnectionStatus(tenantId) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase
    .from('google_ads_connections')
    .select('tenant_id, google_email, customer_id, login_customer_id, connection_status, connected_at, updated_at')
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    tenantId: data.tenant_id,
    googleEmail: data.google_email,
    customerId: data.customer_id,
    loginCustomerId: data.login_customer_id,
    connectionStatus: data.connection_status,
    connectedAt: data.connected_at,
    updatedAt: data.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export { verifySignedState };

export default {
  generateAuthUrl,
  exchangeCodeForTokens,
  encryptToken,
  decryptToken,
  saveConnection,
  getConnection,
  refreshAccessToken,
  getValidAccessToken,
  listAccessibleAccounts,
  selectAccount,
  disconnect,
  getConnectionStatus,
  verifySignedState,
};
