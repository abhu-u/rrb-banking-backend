const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');
const MOCK_ACCOUNTS = require('../data/mockAccounts');

const getAccount = async (userId) => {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const Account = require('../models/Account');
            const account = await Account.findOne({ userId });
            if (account) return account;
        }
    } catch (_) { }
    return MOCK_ACCOUNTS[userId] || null;
};

// GET /api/accounts/summary
router.get('/summary', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const account = await getAccount(userId);
        if (!account) {
            console.log(`Account lookup failed for userId: ${userId}`);
            return errorResponse(res, 'Account not found', 404);
        }

        const masked = account.accountNumber.replace(/\d(?=\d{4})/g, 'X');
        return successResponse(res, {
            accountNumber: masked,
            balance: account.balance,
            availableBalance: account.availableBalance,
            accountType: account.accountType,
            holderName: account.holderName,
            branchName: account.branchName,
            ifscCode: account.ifscCode,
        }, 'Account summary fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch account summary', 500);
    }
});

// GET /api/accounts/details
router.get('/details', authenticate, async (req, res) => {
    try {
        const account = await getAccount(req.user.id);
        if (!account) return errorResponse(res, 'Account not found', 404);
        return successResponse(res, {
            accountNumber: account.accountNumber,
            accountType: account.accountType,
            balance: account.balance,
            availableBalance: account.availableBalance,
            ifscCode: account.ifscCode,
            branchName: account.branchName,
            holderName: account.holderName,
        }, 'Account details fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch account', 500);
    }
});

// GET /api/accounts/transactions?limit=10
router.get('/transactions', authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const account = await getAccount(req.user.id);
        if (!account) return errorResponse(res, 'Account not found', 404);

        const txns = (account.transactions || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        return successResponse(res, txns, 'Transactions fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch transactions', 500);
    }
});

// POST /api/accounts/transfer
router.post('/transfer', authenticate, async (req, res) => {
    try {
        const { beneficiaryName, accountNumber, amount, remark, transferType, mpin, isBiometric } = req.body;
        const userId = req.user.id;
        const amt = parseFloat(amount);
        const txType = (transferType || 'imps').toLowerCase();

        if (isNaN(amt) || amt <= 0) return errorResponse(res, 'Invalid amount', 400);

        if (!mpin && !isBiometric) {
            return errorResponse(res, 'MPIN or Biometric authentication is required', 400);
        }

        // 0. Validate MPIN (only if not using Biometric)
        if (!isBiometric) {
            let userPinHash = null;
            try {
                const mongoose = require('mongoose');
                if (mongoose.connection.readyState === 1) {
                    const User = require('../models/User');
                    const user = await User.findById(userId).select('+pin');
                    if (user) userPinHash = user.pin;
                }
            } catch (_) { }

            if (!userPinHash) {
                const MOCK_USERS = require('../data/mockUsers');
                const mockUser = MOCK_USERS.find(u => u._id === userId);
                if (mockUser) userPinHash = mockUser.pin;
            }

            if (userPinHash) {
                const bcrypt = require('bcryptjs');
                const pinMatch = await bcrypt.compare(mpin, userPinHash);
                if (!pinMatch) return errorResponse(res, 'Incorrect MPIN', 401);
            }
        }

        // 1. Get sender account
        const account = await getAccount(userId);
        if (!account) return errorResponse(res, 'Sender account not found', 404);

        // 2. Check balance
        if (account.balance < amt) return errorResponse(res, 'Insufficient funds', 400);

        // 3. Build description
        let description;
        if (txType === 'upi') {
            description = `UPI Payment to ${beneficiaryName || accountNumber}`;
        } else {
            description = `Transfer to ${beneficiaryName} (${txType.toUpperCase()})`;
        }

        // 4. Record transaction
        const txnId = `TXN${Date.now()}`;
        const newTxn = {
            _id: txnId,
            date: new Date().toISOString(),
            description,
            amount: amt,
            type: 'debit',
            transferType: txType,
            reference: txnId,
            balance: account.balance - amt,
            remark: remark || '',
        };

        // 5. Update in-memory account
        account.balance -= amt;
        account.availableBalance -= amt;
        if (!account.transactions) account.transactions = [];
        account.transactions.unshift(newTxn); // newest first

        // 6. Persist to MongoDB if connected
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const Account = require('../models/Account');
                await Account.findOneAndUpdate(
                    { userId },
                    {
                        $inc: { balance: -amt, availableBalance: -amt },
                        $push: { transactions: { $each: [newTxn], $position: 0 } }
                    }
                );
            }
        } catch (_) { }

        return successResponse(res, { transaction: newTxn }, 'Transfer successful');
    } catch (err) {
        console.error('Transfer error:', err);
        return errorResponse(res, 'Transfer failed', 500);
    }
});

module.exports = router;
