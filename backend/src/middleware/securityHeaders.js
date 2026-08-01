import logger from "../lib/logger.js";

/**
 * Custom Security Headers Middleware.
 * Applies Helmet-equivalent HTTP security headers for production defense-in-depth (SI11).
 */
export const applySecurityHeaders = (req, res, next) => {
  // Prevent clickjacking via frame embedding
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Strict Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // HTTP Strict Transport Security (HSTS) — 1 year preload
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // Cross-Origin Resource Policy
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");

  // Content Security Policy (CSP) — tailored for React + Razorpay + Cloudinary
  const cspPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    "connect-src 'self' wss: ws: https://lumberjack.razorpay.com https://api.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  res.setHeader("Content-Security-Policy", cspPolicy);

  next();
};
