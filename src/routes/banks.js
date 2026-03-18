const express = require('express');
const router = express.Router();
const { successResponse, errorResponse } = require('../utils/helpers');
const MOCK_BANKS = require('../data/mockBanks');

const getBanks = async () => {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const Bank = require('../models/Bank');
            const banks = await Bank.find({ isActive: true });
            if (banks && banks.length > 0) return banks;
        }
    } catch (_) { }
    return MOCK_BANKS.filter(b => b.isActive);
};

// GET /api/banks – list all active banks
router.get('/', async (req, res) => {
    try {
        const { state, search } = req.query;
        let banks = await getBanks();

        if (state) banks = banks.filter(b => b.state.toLowerCase() === state.toLowerCase());
        if (search) {
            const q = search.toLowerCase();
            banks = banks.filter(b =>
                b.name.toLowerCase().includes(q) ||
                b.shortName.toLowerCase().includes(q) ||
                b.state.toLowerCase().includes(q)
            );
        }
        return successResponse(res, banks, 'Banks fetched successfully');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch banks', 500);
    }
});

// GET /api/banks/states – get distinct states
router.get('/states', async (req, res) => {
    try {
        const banks = await getBanks();
        const states = [...new Set(banks.map(b => b.state))].sort();
        return successResponse(res, states, 'States fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch states', 500);
    }
});

// GET /api/banks/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let bank;
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const Bank = require('../models/Bank');
                bank = await Bank.findById(id);
            }
        } catch (_) { }
        if (!bank) bank = MOCK_BANKS.find(b => b._id === id || b.code === id);
        if (!bank) return errorResponse(res, 'Bank not found', 404);
        return successResponse(res, bank, 'Bank details fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch bank', 500);
    }
});

module.exports = router;
