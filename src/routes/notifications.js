const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');
const MOCK_NOTIFICATIONS = require('../data/mockNotifications');

const getNotifications = async (userId) => {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const Notification = require('../models/Notification');
            const notifs = await Notification.find({ userId }).sort({ createdAt: -1 });
            if (notifs && notifs.length > 0) return notifs;
        }
    } catch (_) { }
    return (MOCK_NOTIFICATIONS[userId] || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
    try {
        const notifs = await getNotifications(req.user.id);
        return successResponse(res, notifs, 'Notifications fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch notifications', 500);
    }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req, res) => {
    try {
        const notifs = await getNotifications(req.user.id);
        const count = notifs.filter(n => !n.isRead).length;
        return successResponse(res, { count }, 'Unread count fetched');
    } catch (err) {
        return errorResponse(res, 'Failed to fetch count', 500);
    }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
    try {
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const Notification = require('../models/Notification');
                await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
            }
        } catch (_) {
            // Mock: update in-memory
            const userNotifs = MOCK_NOTIFICATIONS[req.user.id] || [];
            const n = userNotifs.find(n => n._id === req.params.id);
            if (n) n.isRead = true;
        }
        return successResponse(res, null, 'Marked as read');
    } catch (err) {
        return errorResponse(res, 'Failed to mark as read', 500);
    }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req, res) => {
    try {
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const Notification = require('../models/Notification');
                await Notification.updateMany({ userId: req.user.id }, { isRead: true });
            }
        } catch (_) {
            const userNotifs = MOCK_NOTIFICATIONS[req.user.id] || [];
            userNotifs.forEach(n => (n.isRead = true));
        }
        return successResponse(res, null, 'All notifications marked as read');
    } catch (err) {
        return errorResponse(res, 'Failed to mark all as read', 500);
    }
});

module.exports = router;
