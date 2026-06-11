const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

// General API rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 100 : 5000, // More lenient outside production
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again later',
    skip: (req) => {
        // Skip rate limiting for health check endpoint
        return req.path === '/';
    }
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 50 : 1000, // Limit login/register attempts
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts, please try again after 15 minutes',
    skip: (req) => {
        // Only login/register need the stricter auth limit.
        return req.method !== 'POST' || !['/login', '/register'].includes(req.path);
    }
});

module.exports = { limiter, authLimiter };
