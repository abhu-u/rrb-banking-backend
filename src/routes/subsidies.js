const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');
const MOCK_SUBSIDIES = require('../data/mockSubsidies');

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
        return successResponse(res, {
            total: subsidies.length,
            active: subsidies.filter(s => s.status === 'active').length,
            pending: subsidies.filter(s => s.status === 'pending').length,
            disbursed: subsidies.filter(s => s.status === 'disbursed').length,
            totalBenefit: subsidies.reduce((s, sub) => s + (sub.benefitAmount || 0), 0),
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

module.exports = router;
