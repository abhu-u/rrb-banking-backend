const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse } = require('../utils/helpers');
const MOCK_USERS = require('../data/mockUsers');
const MOCK_BANKS = require('../data/mockBanks');
const MOCK_ACCOUNTS = require('../data/mockAccounts');
const MOCK_LOANS = require('../data/mockLoans');
const MOCK_SUBSIDIES = require('../data/mockSubsidies');
const MOCK_NOTIFICATIONS = require('../data/mockNotifications');
const APPLICATIONS = require('../data/mockSubsidyApplications');

// Simple admin key middleware (replace with proper admin auth in production)
const adminAuth = (req, res, next) => {
    const key = req.headers['x-admin-key'];
    if (key !== 'RRB_ADMIN_2024') {
        return res.status(403).json({ success: false, message: 'Unauthorized: Invalid admin key' });
    }
    next();
};

// GET /api/admin/users
router.get('/users', adminAuth, (req, res) => {
    const users = MOCK_USERS.map(u => ({ ...u, pin: '[PROTECTED]' }));
    return successResponse(res, users, 'Users fetched');
});

// GET /api/admin/banks
router.get('/banks', adminAuth, async (req, res) => {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const Bank = require('../models/Bank');
            const banks = await Bank.find();
            if (banks && banks.length > 0) return successResponse(res, banks, 'Banks fetched from DB');
        }
    } catch (_) { }
    return successResponse(res, MOCK_BANKS, 'Banks fetched from mock');
});

// POST /api/admin/banks - Add new bank
router.post('/banks', adminAuth, async (req, res) => {
    try {
        const bankData = req.body;
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const Bank = require('../models/Bank');
            const newBank = new Bank(bankData);
            await newBank.save();
            return successResponse(res, newBank, 'Bank added to DB', 201);
        }
        // Fallback to mock (in-memory only)
        const mockBank = { ...bankData, _id: `bank_${Date.now()}` };
        MOCK_BANKS.push(mockBank);
        return successResponse(res, mockBank, 'Bank added to mock (not persistent)', 201);
    } catch (err) {
        return errorResponse(res, 'Failed to add bank: ' + err.message, 500);
    }
});

// PUT /api/admin/banks/:id - Update bank
router.put('/banks/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const bankData = req.body;
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const Bank = require('../models/Bank');
            const updatedBank = await Bank.findByIdAndUpdate(id, bankData, { new: true });
            if (updatedBank) return successResponse(res, updatedBank, 'Bank updated in DB');
        }
        // Fallback to mock
        const index = MOCK_BANKS.findIndex(b => b._id === id);
        if (index !== -1) {
            MOCK_BANKS[index] = { ...MOCK_BANKS[index], ...bankData };
            return successResponse(res, MOCK_BANKS[index], 'Bank updated in mock');
        }
        return errorResponse(res, 'Bank not found', 404);
    } catch (err) {
        return errorResponse(res, 'Failed to update bank: ' + err.message, 500);
    }
});

// DELETE /api/admin/banks/:id - Delete bank
router.delete('/banks/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const Bank = require('../models/Bank');
            await Bank.findByIdAndDelete(id);
            return successResponse(res, null, 'Bank deleted from DB');
        }
        // Fallback to mock
        const index = MOCK_BANKS.findIndex(b => b._id === id);
        if (index !== -1) {
            MOCK_BANKS.splice(index, 1);
            return successResponse(res, null, 'Bank deleted from mock');
        }
        return errorResponse(res, 'Bank not found', 404);
    } catch (err) {
        return errorResponse(res, 'Failed to delete bank: ' + err.message, 500);
    }
});


// GET /api/admin/stats
router.get('/stats', adminAuth, (req, res) => {
    const totalLoans = Object.values(MOCK_LOANS).flat().length;
    const totalSubsidies = Object.values(MOCK_SUBSIDIES).flat().length;
    const totalNotifications = Object.values(MOCK_NOTIFICATIONS).flat().length;

    return successResponse(res, {
        users: MOCK_USERS.length,
        banks: MOCK_BANKS.length,
        accounts: Object.keys(MOCK_ACCOUNTS).length,
        loans: totalLoans,
        subsidies: totalSubsidies,
        notifications: totalNotifications,
    }, 'Admin stats fetched');
});

// POST /api/admin/users – create mock user
router.post('/users', adminAuth, async (req, res) => {
    try {
        const { mobile, pin, bankId, bankCode, name, languagePreference, state } = req.body;
        if (!mobile || !pin || !bankId) {
            return errorResponse(res, 'mobile, pin, bankId are required', 400);
        }
        const existing = MOCK_USERS.find(u => u.mobile === mobile);
        if (existing) return errorResponse(res, 'User already exists', 409);

        const hashedPin = await bcrypt.hash(String(pin), 12);
        const newUser = {
            _id: `user_${Date.now()}`,
            mobile,
            pin: hashedPin,
            bankId,
            bankCode: bankCode || '',
            name: name || '',
            languagePreference: languagePreference || 'en',
            state: state || '',
            isVerified: true,
            isActive: true,
        };
        MOCK_USERS.push(newUser);
        return successResponse(res, { ...newUser, pin: '[PROTECTED]' }, 'Mock user created', 201);
    } catch (err) {
        return errorResponse(res, 'Failed to create user: ' + err.message, 500);
    }
});

// POST /api/admin/users/:userId/account – create/update account
router.post('/users/:userId/account', adminAuth, (req, res) => {
    const { userId } = req.params;
    const { balance, accountType, holderName, branchName, bankId } = req.body;

    MOCK_ACCOUNTS[userId] = {
        _id: `acc_${Date.now()}`,
        userId,
        bankId: bankId || 'bank_001',
        accountNumber: `9999${Date.now().toString().slice(-10)}`,
        accountType: accountType || 'savings',
        balance: parseFloat(balance) || 0,
        availableBalance: parseFloat(balance) || 0,
        ifscCode: 'MOCK0001234',
        branchName: branchName || 'Main Branch',
        holderName: holderName || 'Account Holder',
        isActive: true,
        transactions: [],
    };
    return successResponse(res, MOCK_ACCOUNTS[userId], 'Account created/updated', 201);
});

// POST /api/admin/users/:userId/loans – add loan
router.post('/users/:userId/loans', adminAuth, (req, res) => {
    const { userId } = req.params;
    if (!MOCK_LOANS[userId]) MOCK_LOANS[userId] = [];

    const loan = {
        _id: `loan_${Date.now()}`,
        userId,
        bankId: req.body.bankId || 'bank_001',
        loanType: req.body.loanType || 'agriculture',
        loanNumber: `LN/${Date.now()}`,
        principalAmount: parseFloat(req.body.principalAmount) || 0,
        outstandingAmount: parseFloat(req.body.outstandingAmount || req.body.principalAmount) || 0,
        interestRate: parseFloat(req.body.interestRate) || 7,
        tenure: parseInt(req.body.tenure) || 12,
        emiAmount: parseFloat(req.body.emiAmount) || 0,
        status: req.body.status || 'pending',
        purpose: req.body.purpose || '',
        disbursedDate: req.body.disbursedDate || null,
        dueDate: req.body.dueDate || null,
        nextEmiDate: req.body.nextEmiDate || null,
    };
    MOCK_LOANS[userId].push(loan);

    // If disbursed, credit the user's account
    if (loan.status === 'disbursed' && MOCK_ACCOUNTS[userId]) {
        const account = MOCK_ACCOUNTS[userId];
        const amt = loan.principalAmount;
        const txnId = `TXN_DISB_${Date.now()}`;

        const disbusementTxn = {
            _id: txnId,
            date: new Date().toISOString(),
            description: `Loan Disbursal: ${loan.loanType}`,
            amount: amt,
            type: 'credit',
            reference: txnId,
            balance: account.balance + amt,
            remark: `Disbursed to A/c ${account.accountNumber}`
        };

        account.balance += amt;
        account.availableBalance += amt;
        if (!account.transactions) account.transactions = [];
        account.transactions.unshift(disbusementTxn);
    }

    return successResponse(res, loan, 'Loan added and account credited (if disbursed)', 201);
});

// POST /api/admin/users/:userId/subsidies – add subsidy
router.post('/users/:userId/subsidies', adminAuth, (req, res) => {
    const { userId } = req.params;
    if (!MOCK_SUBSIDIES[userId]) MOCK_SUBSIDIES[userId] = [];

    const subsidy = {
        _id: `sub_${Date.now()}`,
        userId,
        bankId: req.body.bankId || 'bank_001',
        schemeName: req.body.schemeName || 'Unknown Scheme',
        schemeCode: req.body.schemeCode || '',
        ministry: req.body.ministry || '',
        benefitAmount: parseFloat(req.body.benefitAmount) || 0,
        benefitType: req.body.benefitType || 'cash',
        status: req.body.status || 'pending',
        category: req.body.category || 'agriculture',
        description: req.body.description || '',
        applicationDate: req.body.applicationDate || new Date().toISOString(),
        approvalDate: req.body.approvalDate || null,
        disbursementDate: req.body.disbursementDate || null,
        documents: req.body.documents || [],
    };
    MOCK_SUBSIDIES[userId].push(subsidy);
    return successResponse(res, subsidy, 'Subsidy added', 201);
});

// POST /api/admin/users/:userId/notifications – push notification
router.post('/users/:userId/notifications', adminAuth, (req, res) => {
    const { userId } = req.params;
    if (!MOCK_NOTIFICATIONS[userId]) MOCK_NOTIFICATIONS[userId] = [];

    const notif = {
        _id: `notif_${Date.now()}`,
        userId,
        title: req.body.title || 'Notification',
        message: req.body.message || '',
        type: req.body.type || 'info',
        isRead: false,
        icon: req.body.icon || 'information-circle',
        amount: req.body.amount || null,
        referenceId: req.body.referenceId || null,
        priority: req.body.priority || 'medium',
        createdAt: new Date().toISOString(),
    };
    MOCK_NOTIFICATIONS[userId].push(notif);
    return successResponse(res, notif, 'Notification pushed', 201);
});

// POST /api/admin/users/:userId/transactions – push mock transaction
router.post('/users/:userId/transactions', adminAuth, (req, res) => {
    const { userId } = req.params;
    const { description, amount, type, reference, remark } = req.body;

    if (!MOCK_ACCOUNTS[userId]) return errorResponse(res, 'Account not found', 404);

    const account = MOCK_ACCOUNTS[userId];
    const amt = parseFloat(amount) || 0;

    const newTxn = {
        _id: `txn_${Date.now()}`,
        date: new Date().toISOString(),
        description: description || (type === 'credit' ? 'Money Received' : 'Payment Made'),
        amount: amt,
        type: type || 'debit',
        reference: reference || `REF${Date.now().toString().slice(-8)}`,
        balance: type === 'credit' ? (account.balance + amt) : (account.balance - amt),
        remark: remark || ''
    };

    // Update account balance
    if (type === 'credit') {
        account.balance += amt;
    } else {
        account.balance -= amt;
    }
    account.availableBalance = account.balance;

    if (!account.transactions) account.transactions = [];
    account.transactions.push(newTxn);

    return successResponse(res, newTxn, 'Mock transaction added', 201);
});

// GET /api/admin/subsidy-applications — list all pending applications
router.get('/subsidy-applications', adminAuth, (req, res) => {
    const { status } = req.query;
    let apps = [...APPLICATIONS];
    if (status) apps = apps.filter(a => a.status === status);
    return successResponse(res, apps, 'Applications fetched');
});

// PATCH /api/admin/subsidy-applications/:id — approve or reject
router.patch('/subsidy-applications/:id', adminAuth, (req, res) => {
    const { status, remarks } = req.body;
    if (!['approved', 'rejected', 'disbursed'].includes(status)) {
        return errorResponse(res, 'Status must be approved, rejected, or disbursed', 400);
    }

    const appIndex = APPLICATIONS.findIndex(a => a._id === req.params.id);
    if (appIndex === -1) return errorResponse(res, 'Application not found', 404);

    APPLICATIONS[appIndex].status = status;
    APPLICATIONS[appIndex].reviewedAt = new Date().toISOString();
    APPLICATIONS[appIndex].remarks = remarks || '';

    // If approved or disbursed, add to the user's subsidy list
    if (status === 'approved' || status === 'disbursed') {
        const app = APPLICATIONS[appIndex];
        if (!MOCK_SUBSIDIES[app.userId]) MOCK_SUBSIDIES[app.userId] = [];
        const alreadyAdded = MOCK_SUBSIDIES[app.userId].find(s => s.schemeCode === app.schemeCode);
        if (!alreadyAdded) {
            MOCK_SUBSIDIES[app.userId].unshift({
                _id: `sub_${Date.now()}`,
                userId: app.userId,
                bankId: app.bankId,
                schemeName: app.schemeName,
                schemeCode: app.schemeCode,
                benefitAmount: app.benefitAmount,
                status: status === 'disbursed' ? 'disbursed' : 'active',
                applicationDate: app.appliedAt,
                disbursementDate: status === 'disbursed' ? new Date().toISOString() : null,
                description: `Approved: ${app.schemeName}`,
                category: 'agriculture',
                ministry: 'Govt. of Maharashtra',
            });
        }
        // Also push a notification to the user
        if (!MOCK_NOTIFICATIONS[app.userId]) MOCK_NOTIFICATIONS[app.userId] = [];
        MOCK_NOTIFICATIONS[app.userId].unshift({
            _id: `notif_${Date.now()}`,
            userId: app.userId,
            title: status === 'disbursed' ? '💰 Subsidy Disbursed!' : '✅ Application Approved',
            message: status === 'disbursed'
                ? `₹${app.benefitAmount.toLocaleString('en-IN')} for ${app.schemeName} has been credited to your account.`
                : `Your application for ${app.schemeName} has been approved.`,
            type: 'success',
            isRead: false,
            icon: 'checkmark-circle',
            amount: app.benefitAmount,
            priority: 'high',
            createdAt: new Date().toISOString(),
        });
    } else if (status === 'rejected') {
        const app = APPLICATIONS[appIndex];
        if (!MOCK_NOTIFICATIONS[app.userId]) MOCK_NOTIFICATIONS[app.userId] = [];
        MOCK_NOTIFICATIONS[app.userId].unshift({
            _id: `notif_${Date.now()}`,
            userId: app.userId,
            title: '❌ Application Rejected',
            message: `Your application for ${app.schemeName} was not approved. Remarks: ${remarks || 'Please contact your branch.'}`,
            type: 'error',
            isRead: false,
            icon: 'close-circle',
            priority: 'medium',
            createdAt: new Date().toISOString(),
        });
    }

    return successResponse(res, APPLICATIONS[appIndex], 'Application updated');
});

module.exports = router;
