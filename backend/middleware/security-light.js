/**
 * Lightweight Security Headers Middleware (Serverless-friendly)
 *
 * Provides minimal, zero-state security headers without heavy processing.
 * Designed for serverless environments where stateful operations are expensive.
 *
 * Headers implemented:
 * - Strict-Transport-Security (HSTS)
 * - Content-Security-Policy (CSP) with allow-listed origins
 * - Referrer-Policy
 * - Permissions-Policy
 * - X-Content-Type-Options
 * - X-Frame-Options
 */

/**
 * Lightweight security headers middleware
 * No state, no heavy processing, just header application
 */
export function securityHeadersMiddleware() {
  return (req, res, next) => {
    // Only apply in production unless explicitly enabled
    const isProduction = process.env.NODE_ENV === 'production';
    const isEnabled = process.env.ENABLE_SECURITY_HEADERS === 'true' ||
                     (isProduction && process.env.ENABLE_SECURITY_HEADERS !== 'false');

    if (!isEnabled) {
      return next();
    }

    // Strict-Transport-Security (HSTS)
    // Enforces HTTPS connections for 2 years, including subdomains
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains'
    );

    // Content-Security-Policy (CSP)
    // Allow self and required origins for Shopify integration
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://cdn.shopify.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com https://cdn.shopify.com",
      "connect-src 'self' https://*.googleapis.com https://*.supabase.co https://ads-autopilot-ui.vercel.app wss://*.supabase.co",
      "frame-src 'self' https://js.stripe.com https://admin.shopify.com",
      "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com",
      "base-uri 'self'",
      "form-action 'self'"
    ];
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

    // Referrer-Policy
    // Only send origin when navigating to different origin
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions-Policy (formerly Feature-Policy)
    // Disable unnecessary browser features to reduce attack surface
    const permissionsDirectives = [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'bluetooth=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()'
    ];
    res.setHeader('Permissions-Policy', permissionsDirectives.join(', '));

    // X-Content-Type-Options
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options
    // Allow framing from Shopify admin (required for embedded apps)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    next();
  };
}

/**
 * Health check endpoint for verifying security headers
 */
export function securityHealthCheck(req, res) {
  const isEnabled = process.env.ENABLE_SECURITY_HEADERS === 'true' ||
                   (process.env.NODE_ENV === 'production' && process.env.ENABLE_SECURITY_HEADERS !== 'false');

  res.json({
    ok: true,
    security_headers: {
      enabled: isEnabled,
      environment: process.env.NODE_ENV || 'development',
      headers_applied: isEnabled ? [
        'Strict-Transport-Security',
        'Content-Security-Policy',
        'Referrer-Policy',
        'Permissions-Policy',
        'X-Content-Type-Options',
        'X-Frame-Options'
      ] : []
    },
    timestamp: new Date().toISOString()
  });
}

export default securityHeadersMiddleware;
