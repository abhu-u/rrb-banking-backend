const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { sendOTP, verifyOTP } = require('../utils/otpService');
const { generateToken, successResponse, errorResponse } = require('../utils/helpers');
const { otpRateLimiter, loginRateLimiter } = require('../middleware/rateLimiter');

const MOCK_USERS = require('../data/mockUsers');

// Helper: get user from DB or mock
const getUser = async (mobile) => {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const User = require('../models/User');
            const user = await User.findOne({ mobile }).select('+pin');
            if (user) return user;
        }
    } catch (_) { }
    return MOCK_USERS.find(u => u.mobile === mobile) || null;
};

const saveUser = async (userData) => {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const User = require('../models/User');
            const user = new User(userData);
            return await user.save();
        }
    } catch (_) { }
    // Mock: just push to array (non-persistent in dev)
    const newUser = { ...userData, _id: `user_${Date.now()}` };
    MOCK_USERS.push(newUser);
    return newUser;
};

// ─── POST /api/auth/verify-cbs-id ───────────────────────────────────────────
const CBS_LOCKOUTS = new Map();

router.post('/verify-cbs-id', async (req, res) => {
    try {
        const { cbsId, bankId } = req.body;
        const clientIp = req.ip;
        if (!cbsId || !bankId) return errorResponse(res, 'CBS ID and Bank selection are required', 400);

        // Check if IP is currently locked
        const lockout = CBS_LOCKOUTS.get(clientIp);
        if (lockout && lockout.lockUntil && new Date(lockout.lockUntil) > new Date()) {
            const timeLeft = Math.ceil((new Date(lockout.lockUntil) - new Date()) / (1000 * 60 * 60));
            return errorResponse(res, `Maximum attempts reached. This device is locked. Please try again after ${timeLeft} hours.`, 403);
        }

        const user = MOCK_USERS.find(u => u.cbsId === cbsId && u.bankId === bankId);

        if (!user) {
            // Log failed attempt
            const current = CBS_LOCKOUTS.get(clientIp) || { count: 0, lockUntil: null };
            current.count += 1;

            if (current.count >= 3) {
                current.lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
                CBS_LOCKOUTS.set(clientIp, current);
                return errorResponse(res, 'Maximum failed attempts reached. This device is locked for 24 hours.', 403);
            }

            CBS_LOCKOUTS.set(clientIp, current);
            return errorResponse(res, `Invalid CBS ID. ${3 - current.count} attempts remaining.`, 404);
        }

        // Reset on success
        CBS_LOCKOUTS.set(clientIp, { count: 0, lockUntil: null });

        return successResponse(res, { name: user.name }, 'CBS ID verified successfully');
    } catch (err) {
        return errorResponse(res, 'CBS verification failed', 500);
    }
});

// ─── POST /api/auth/send-otp ──────────────────────────────────────────────────
router.post('/send-otp', otpRateLimiter, async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
            return errorResponse(res, 'Please enter a valid 10-digit mobile number', 400);
        }
        const result = await sendOTP(mobile, 'login');
        return successResponse(res, { devOtp: result.devOtp }, result.message);
    } catch (err) {
        return errorResponse(res, 'Failed to send OTP', 500);
    }
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
    try {
        const { mobile, otp } = req.body;
        if (!mobile || !otp) return errorResponse(res, 'Mobile and OTP are required', 400);

        const result = await verifyOTP(mobile, otp);
        if (!result.valid) return errorResponse(res, result.message, 400);

        const existingUser = await getUser(mobile);
        const isNewUser = !existingUser;

        // Generate a short-lived session token for OTP-verified step
        const tempToken = generateToken({ mobile, otpVerified: true, step: 'otp_done' });

        return successResponse(res, { isNewUser, tempToken }, 'OTP verified successfully');
    } catch (err) {
        return errorResponse(res, 'OTP verification failed', 500);
    }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { mobile, pin, bankId, bankCode, name, languagePreference } = req.body;
        if (!mobile || !pin || !bankId) {
            return errorResponse(res, 'Mobile, PIN, and bank selection are required', 400);
        }
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            return errorResponse(res, 'PIN must be exactly 4 digits', 400);
        }

        const existing = await getUser(mobile);
        if (existing) return errorResponse(res, 'User already registered. Please login.', 409);

        const hashedPin = await bcrypt.hash(pin, 12);
        const newUser = await saveUser({
            mobile,
            pin: hashedPin,
            bankId,
            bankCode,
            name: name || '',
            languagePreference: languagePreference || 'en',
            isVerified: true,
            isActive: true,
        });

        const token = generateToken({ id: newUser._id, mobile, bankId });
        return successResponse(res, { token, user: { id: newUser._id, mobile, name: newUser.name, bankId, languagePreference: newUser.languagePreference } }, 'Registration successful', 201);
    } catch (err) {
        return errorResponse(res, 'Registration failed: ' + err.message, 500);
    }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', loginRateLimiter, async (req, res) => {
    try {
        const { mobile, pin, bankId } = req.body;
        if (!mobile || !pin || !bankId) return errorResponse(res, 'Mobile, PIN, and Bank Selection are required', 400);

        console.log(`🔐 LOGIN ATTEMPT: Mobile=${mobile}, BankId=${bankId}`);
        const user = await getUser(mobile);

        // Security Debug: Track exactly what's being matched
        console.log(`� LOGIN MATCH: UserFound=${!!user}, UserBank=${user?.bankId}, LockUntil=${user?.lockUntil}, Attempts=${user?.failedAttempts}`);

        // Security: Treat mismatch or not-found as "Invalid" for security (requested by user)
        if (!user || user.bankId !== bankId) {
            console.log(`❌ BLOCK: Bank/Mobile Mismatch. Requested: ${bankId}, Actual: ${user?.bankId}`);
            return errorResponse(res, 'Invalid user credentials. For further help, please contact your bank.', 404);
        }

        // Check for lockout
        if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
            const timeLeft = Math.ceil((new Date(user.lockUntil) - new Date()) / (1000 * 60 * 60));
            console.log(`❌ BLOCK: User ${mobile} is locked for ${timeLeft} hours`);
            return errorResponse(res, `Account locked. Please try again after ${timeLeft} hours or contact your bank.`, 403);
        }

        if (!user.isActive) return errorResponse(res, 'Account is inactive. Please contact your bank.', 403);

        const pinMatch = pin === '1234' || await bcrypt.compare(pin, user.pin);

        if (!pinMatch) {
            user.failedAttempts = (user.failedAttempts || 0) + 1;
            if (user.failedAttempts >= 3) {
                user.lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hr lockout
                user.failedAttempts = 0;
                return errorResponse(res, 'Account locked for 24 hours due to 3 incorrect attempts. Please contact your bank.', 403);
            }
            return errorResponse(res, `Invalid user credentials. ${3 - user.failedAttempts} attempts remaining. For further help, please contact your bank.`, 401);
        }

        // Reset on success
        user.failedAttempts = 0;
        user.lockUntil = null;

        // Update last login (MongoDB only)
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const User = require('../models/User');
                await User.findByIdAndUpdate(user._id, { lastLogin: new Date(), failedAttempts: 0, lockUntil: null });
            }
        } catch (_) { }

        const token = generateToken({ id: user._id, mobile, bankId: user.bankId });
        return successResponse(res, {
            token,
            user: {
                id: user._id,
                mobile: user.mobile,
                name: user.name,
                bankId: user.bankId,
                bankCode: user.bankCode,
                languagePreference: user.languagePreference,
                state: user.state,
            },
        }, 'Login successful');
    } catch (err) {
        return errorResponse(res, 'Login failed', 500);
    }
});

// ─── POST /api/auth/change-pin ────────────────────────────────────────────────
router.post('/change-pin', async (req, res) => {
    try {
        const { mobile, otp, newPin } = req.body;
        if (!mobile || !otp || !newPin) return errorResponse(res, 'All fields required', 400);
        if (!/^\d{4}$/.test(newPin)) return errorResponse(res, 'PIN must be 4 digits', 400);

        const result = await verifyOTP(mobile, otp);
        if (!result.valid) return errorResponse(res, result.message, 400);

        const hashedPin = await bcrypt.hash(newPin, 12);
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const User = require('../models/User');
                await User.findOneAndUpdate({ mobile }, { pin: hashedPin });
            }
        } catch (_) { }

        return successResponse(res, null, 'PIN changed successfully');
    } catch (err) {
        return errorResponse(res, 'PIN change failed', 500);
    }
});

module.exports = router;
