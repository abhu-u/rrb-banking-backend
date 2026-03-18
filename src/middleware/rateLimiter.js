const rateLimit = require('express-rate-limit');

const otpRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 min for dev
    max: 100, // Very high for dev
    message: {
        success: false,
        message: 'Too many OTP requests. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 min for dev
    max: 100, // Very high for dev
    message: {
        success: false,
        message: 'Too many login attempts. Please try again later.',
    },
});

const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests. Please slow down.' },
});

module.exports = { otpRateLimiter, loginRateLimiter, apiRateLimiter };
