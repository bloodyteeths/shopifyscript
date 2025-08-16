import { createCookieSessionStorage, Session } from "@remix-run/node";
import crypto from 'crypto';

// Session storage configuration
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "proofkit_session",
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_SECRET || "fallback-secret-change-me"],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
  },
});

export interface User {
  id: string;
  shop: string;
  email?: string;
  accessToken: string;
  scope: string;
  verified: boolean;
  createdAt: string;
}

export interface AuthSession {
  user?: User;
  shop?: string;
  state?: string;
  redirectTo?: string;
  error?: string;
}

export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "AuthError";
  }
}

// Session management
export async function getSession(request: Request): Promise<Session> {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function createUserSession(
  user: User,
  redirectTo: string = "/app"
): Promise<Response> {
  const session = await sessionStorage.getSession();
  session.set("user", user);
  session.unset("error");
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function requireUser(request: Request): Promise<User> {
  const session = await getSession(request);
  const user = session.get("user");
  
  if (!user) {
    throw new AuthError("Authentication required", "UNAUTHORIZED");
  }
  
  if (!user.verified) {
    throw new AuthError("Shop verification required", "UNVERIFIED");
  }
  
  return user;
}

export async function getUser(request: Request): Promise<User | null> {
  try {
    return await requireUser(request);
  } catch {
    return null;
  }
}

export async function logout(request: Request): Promise<Response> {
  const session = await getSession(request);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

// Shopify OAuth helpers
export function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyShopDomain(shop: string): boolean {
  const shopDomain = shop.includes('.') ? shop : `${shop}.myshopify.com`;
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.myshopify\.com$/;
  return domainRegex.test(shopDomain);
}

export function buildAuthUrl(shop: string, state: string, scopes: string[]): string {
  const shopDomain = shop.includes('.') ? shop : `${shop}.myshopify.com`;
  const clientId = process.env.SHOPIFY_API_KEY;
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI || "http://localhost:3000/auth/callback";
  
  if (!clientId) {
    throw new AuthError("Shopify API key not configured");
  }
  
  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes.join(','),
    redirect_uri: redirectUri,
    state,
    'grant_options[]': 'per-user'
  });
  
  return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
}

export function verifyHmac(query: URLSearchParams, hmac: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    throw new AuthError("Shopify webhook secret not configured");
  }
  
  // Remove hmac and signature from query params
  const params = new URLSearchParams(query);
  params.delete('hmac');
  params.delete('signature');
  
  // Sort parameters and build query string
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  const calculatedHmac = crypto
    .createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(calculatedHmac, 'hex'),
    Buffer.from(hmac, 'hex')
  );
}

// Error handling for sessions
export async function setError(
  request: Request,
  error: string
): Promise<Response> {
  const session = await getSession(request);
  session.flash("error", error);
  
  return new Response(null, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function getError(request: Request): Promise<string | null> {
  const session = await getSession(request);
  return session.get("error") || null;
}

// Utility for checking if user has required scopes
export function hasScope(user: User, requiredScope: string): boolean {
  const userScopes = user.scope.split(',');
  return userScopes.includes(requiredScope);
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const current = rateLimitMap.get(identifier);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}