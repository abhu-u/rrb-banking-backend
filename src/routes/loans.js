const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');
const MOCK_LOANS = require('../data/mockLoans');

const getLoans = async (userId) => {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const Loan = require('../models/Loan');
            const loans = await Loan.find({ userId });
            if (loans && loans.length > 0) return loans;
        }
    } catch (_) { }
    return MOCK_LOANS[userId] || [];
};

const LOAN_TYPE_LABELS = {
    kcc: 'Kisan Credit Card (KCC)',
    agriculture: 'Agriculture Loan',
    smallBusiness: 'Small Business Loan',
    personal: 'Personal Loan',
    housing: 'Housing Loan',
};

// GET /api/loans – all loans for user
router.get('/', authenticate, async (req, res) => {
    try {
        const loans = await getLoans(req.user.id);
        const enriched = loans.map(l => ({
            ...l,
            loanTypeLabel: LOAN_TYPE_LABELS[l.loanType] || l.loanType,
        }));
        return successResponse(res, enriched, 'Loans fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch loans', 500);
    }
});

// GET /api/loans/summary – counts by status
router.get('/summary', authenticate, async (req, res) => {
    try {
        const loans = await getLoans(req.user.id);
        const summary = {
            total: loans.length,
            approved: loans.filter(l => l.status === 'approved').length,
            pending: loans.filter(l => l.status === 'pending').length,
            eligible: loans.filter(l => l.status === 'eligible').length,
            totalOutstanding: loans.reduce((s, l) => s + (l.outstandingAmount || 0), 0),
        };
        return successResponse(res, summary, 'Loan summary fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch loan summary', 500);
    }
});

// GET /api/loans/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const loans = await getLoans(req.user.id);
        const loan = loans.find(l => l._id === req.params.id || String(l._id) === req.params.id);
        if (!loan) return errorResponse(res, 'Loan not found', 404);
        return successResponse(res, { ...loan, loanTypeLabel: LOAN_TYPE_LABELS[loan.loanType] }, 'Loan details fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch loan', 500);
    }
});

// POST /api/loans/apply – submit loan application
router.post('/apply', authenticate, async (req, res) => {
    try {
        const { loanType, principalAmount, purpose, tenure } = req.body;
        if (!loanType || !principalAmount || !purpose) {
            return errorResponse(res, 'loanType, principalAmount, and purpose are required', 400);
        }
        // In production: save to DB and trigger workflow
        return successResponse(res, {
            applicationId: `APP_${Date.now()}`,
            loanType,
            principalAmount,
            status: 'pending',
            message: 'Your loan application has been submitted. You will receive an update within 2-3 working days.',
        }, 'Loan application submitted', 201);
    } catch (err) {
        return errorResponse(res, 'Failed to submit loan application', 500);
    }
});

module.exports = router;
