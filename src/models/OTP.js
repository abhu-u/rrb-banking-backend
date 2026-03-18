const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
    {
        mobile: { type: String, required: true },
        otp: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        isUsed: { type: Boolean, default: false },
        attempts: { type: Number, default: 0 },
        purpose: { type: String, enum: ['login', 'register', 'reset'], default: 'login' },
    },
    { timestamps: true }
);

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
