const jwt = require('jsonwebtoken');

const MOCK_USERS = require('../data/mockUsers');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // Try MongoDB first, fall back to mock
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const User = require('../models/User');
                const user = await User.findById(decoded.id);
                if (user && user.isActive) {
                    req.userDoc = user;
                }
            }

            if (!req.userDoc) {
                const mockUser = MOCK_USERS.find(u => u._id === decoded.id);
                if (mockUser && mockUser.isActive) {
                    req.userDoc = mockUser;
                }
            }

            if (!req.userDoc) {
                return res.status(401).json({ success: false, message: 'User not found or inactive' });
            }
        } catch (dbErr) {
            const mockUser = MOCK_USERS.find(u => u._id === decoded.id);
            req.userDoc = mockUser;
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

module.exports = { authenticate };
