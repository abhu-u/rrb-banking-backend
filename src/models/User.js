const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        mobile: { type: String, required: true, unique: true, trim: true },
        pin: { type: String, select: false },
        bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank' },
        bankCode: { type: String },
        isVerified: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        languagePreference: { type: String, default: 'en' },
        name: { type: String, default: '' },
        email: { type: String, default: '' },
        address: { type: String, default: '' },
        state: { type: String, default: '' },
        lastLogin: { type: Date },
        otpAttempts: { type: Number, default: 0 },
        otpLockedUntil: { type: Date },
    },
    { timestamps: true }
);

userSchema.pre('save', async function (next) {
    if (!this.isModified('pin')) return next();
    this.pin = await bcrypt.hash(this.pin, 12);
    next();
});

userSchema.methods.comparePin = async function (candidatePin) {
    return bcrypt.compare(candidatePin, this.pin);
};

module.exports = mongoose.model('User', userSchema);
