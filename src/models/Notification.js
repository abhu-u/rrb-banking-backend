const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank' },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: {
            type: String,
            enum: ['transaction', 'loan', 'subsidy', 'alert', 'info', 'promotional'],
            default: 'info',
        },
        isRead: { type: Boolean, default: false },
        icon: { type: String },
        amount: { type: Number },
        referenceId: { type: String },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
