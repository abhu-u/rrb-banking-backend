const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');
const MOCK_USERS = require('../data/mockUsers');
const MOCK_BANKS = require('../data/mockBanks');
const MOCK_BENEFICIARIES = require('../data/mockBeneficiaries');

// GET /api/profile/beneficiaries
router.get('/beneficiaries', authenticate, async (req, res) => {
    try {
        console.log('✅ Beneficiaries API reached');
        return successResponse(res, MOCK_BENEFICIARIES, 'Beneficiaries fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch beneficiaries', 500);
    }
});

// GET /api/profile
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        let user = req.userDoc;

        if (!user) {
            user = MOCK_USERS.find(u => u._id === userId);
        }
        if (!user) return errorResponse(res, 'User not found', 404);

        const bank = MOCK_BANKS.find(b => b._id === String(user.bankId) || b.code === user.bankCode);

        return successResponse(res, {
            id: user._id,
            name: user.name,
            mobile: user.mobile,
            email: user.email,
            address: user.address,
            state: user.state,
            languagePreference: user.languagePreference,
            bank: bank ? { name: bank.name, code: bank.code, shortName: bank.shortName, state: bank.state } : null,
            isVerified: user.isVerified,
            memberSince: user.createdAt,
        }, 'Profile fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch profile', 500);
    }
});

// PATCH /api/profile/language
router.patch('/language', authenticate, async (req, res) => {
    try {
        const { language } = req.body;
        const SUPPORTED = ['en', 'hi', 'mr', 'ta', 'te', 'kn', 'pa', 'bn', 'gu', 'or', 'ml'];
        if (!language || !SUPPORTED.includes(language)) {
            return errorResponse(res, `Unsupported language. Supported: ${SUPPORTED.join(', ')}`, 400);
        }
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const User = require('../models/User');
                await User.findByIdAndUpdate(req.user.id, { languagePreference: language });
            }
        } catch (_) {
            const u = MOCK_USERS.find(u => u._id === req.user.id);
            if (u) u.languagePreference = language;
        }
        return successResponse(res, { language }, 'Language updated successfully');
    } catch (err) {
        return errorResponse(res, 'Failed to update language', 500);
    }
});

// PATCH /api/profile/update
router.patch('/update', authenticate, async (req, res) => {
    try {
        const { name, email, address } = req.body;
        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
        if (address) updates.address = address;

        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const User = require('../models/User');
                await User.findByIdAndUpdate(req.user.id, updates);
            }
        } catch (_) {
            const u = MOCK_USERS.find(u => u._id === req.user.id);
            if (u) Object.assign(u, updates);
        }
        return successResponse(res, updates, 'Profile updated');
    } catch (err) {
        return errorResponse(res, 'Failed to update profile', 500);
    }
});


module.exports = router;
