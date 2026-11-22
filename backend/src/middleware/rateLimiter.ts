import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for sensitive authentication endpoints (login, register).
 * Throttles excessive attempts per IP to prevent brute-force and credential stuffing.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute sliding window
  max: process.env.NODE_ENV === 'test' ? 1000 : 10, // Max 10 attempts per 15 min (relaxed during automated tests)
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  validate: {
    trustProxy: true,
    xForwardedForHeader: false
  },
  message: {
    status: 'error',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.'
  }
});
