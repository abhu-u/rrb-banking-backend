const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        shortName: { type: String, required: true },
        code: { type: String, required: true, unique: true },
        state: { type: String, required: true },
        stateCode: { type: String },
        logo: { type: String, default: '' },
        ifscPrefix: { type: String },
        headquarter: { type: String },
        sponsorBank: { type: String },
        isActive: { type: Boolean, default: true },
        contactEmail: { type: String },
        contactPhone: { type: String },
        website: { type: String },
        establishedYear: { type: Number },
        totalBranches: { type: Number, default: 0 },
        apiUrl: { type: String, default: '' },
        apiAuthType: { type: String, enum: ['bearer', 'apiKey', 'basic', 'none'], default: 'none' },
        apiAuthValue: { type: String, default: '' },
        balanceEndpoint: { type: String, default: '/api/v1/balance' },
        transactionEndpoint: { type: String, default: '/api/v1/transactions' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Bank', bankSchema);

