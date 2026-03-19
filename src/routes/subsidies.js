const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');
const MOCK_SUBSIDIES = require('../data/mockSubsidies');
const MOCK_USERS = require('../data/mockUsers');
const APPLICATIONS = require('../data/mockSubsidyApplications');

const getSubsidies = async (userId) => {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const Subsidy = require('../models/Subsidy');
            const subsidies = await Subsidy.find({ userId });
            if (subsidies && subsidies.length > 0) return subsidies;
        }
    } catch (_) { }
    return MOCK_SUBSIDIES[userId] || [];
};

// GET /api/subsidies
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, category, bankId } = req.query;
        let subsidies = await getSubsidies(req.user.id);
        if (status) subsidies = subsidies.filter(s => s.status === status);
        if (category) subsidies = subsidies.filter(s => s.category === category);
        if (bankId) subsidies = subsidies.filter(s => s.bankId === bankId);
        return successResponse(res, subsidies, 'Subsidies fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch subsidies', 500);
    }
});

// GET /api/subsidies/summary
router.get('/summary', authenticate, async (req, res) => {
    try {
        const subsidies = await getSubsidies(req.user.id);
        // Also include pending applications in the count but NOT in totalBenefit
        const pendingApps = APPLICATIONS.filter(a => a.userId === req.user.id && a.status === 'pending');
        return successResponse(res, {
            total: subsidies.length + pendingApps.length,
            active: subsidies.filter(s => s.status === 'active').length,
            pending: subsidies.filter(s => s.status === 'pending').length + pendingApps.length,
            disbursed: subsidies.filter(s => s.status === 'disbursed').length,
            // Only count actually active/disbursed schemes for total benefit
            totalBenefit: subsidies
                .filter(s => s.status === 'disbursed' || s.status === 'active')
                .reduce((s, sub) => s + (sub.benefitAmount || 0), 0),
        }, 'Subsidy summary fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch subsidy summary', 500);
    }
});

// GET /api/subsidies/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const subsidies = await getSubsidies(req.user.id);
        const sub = subsidies.find(s => s._id === req.params.id || String(s._id) === req.params.id);
        if (!sub) return errorResponse(res, 'Subsidy not found', 404);
        return successResponse(res, sub, 'Subsidy details fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch subsidy', 500);
    }
});

// POST /api/subsidies/apply
router.post('/apply', authenticate, async (req, res) => {
    try {
        const { schemeName, schemeCode, benefitAmount, formDetails } = req.body;

        if (!schemeName || !schemeCode) {
            return errorResponse(res, 'Scheme name and code are required', 400);
        }

        // Prevent duplicate applications: check existing subsidies AND pending applications
        const userSubsidies = await getSubsidies(req.user.id);
        const existingSubsidy = userSubsidies.find(s => s.schemeCode === schemeCode);
        if (existingSubsidy) {
            return errorResponse(
                res,
                `You are already enrolled in this scheme with status: ${existingSubsidy.status}`,
                400
            );
        }

        const existingApp = APPLICATIONS.find(
            a => a.userId === req.user.id && a.schemeCode === schemeCode
        );
        if (existingApp) {
            return errorResponse(
                res,
                `You have already applied for this scheme. Application status: ${existingApp.status}`,
                400
            );
        }

        // Look up user info for the admin portal
        const user = MOCK_USERS.find(u => u._id === req.user.id) || {};

        const newApplication = {
            _id: `app_${Date.now()}`,
            userId: req.user.id,
            userName: user.name || 'Unknown',
            userMobile: user.mobile || 'Unknown',
            bankId: user.bankId || 'bank_001',
            schemeName,
            schemeCode,
            benefitAmount: benefitAmount || 0,
            status: 'pending', // pending → approved → disbursed  |  pending → rejected
            formDetails: formDetails || {},
            appliedAt: new Date().toISOString(),
            reviewedAt: null,
            remarks: '',
        };

        APPLICATIONS.unshift(newApplication);

        return successResponse(res, newApplication, 'Application submitted. Awaiting admin review.');
    } catch (err) {
        return errorResponse(res, 'Failed to submit application: ' + err.message, 500);
    }
});

// GET /api/subsidies/my-applications  — list all applications for this user
router.get('/my-applications', authenticate, async (req, res) => {
    try {
        const apps = APPLICATIONS.filter(a => a.userId === req.user.id);
        return successResponse(res, apps, 'Applications fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch applications', 500);
    }
});

module.exports = router;
