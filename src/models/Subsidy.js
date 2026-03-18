const mongoose = require('mongoose');

const subsidySchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank', required: true },
        schemeName: { type: String, required: true },
        schemeCode: { type: String },
        ministry: { type: String },
        benefitAmount: { type: Number },
        benefitType: { type: String, enum: ['cash', 'inkind', 'insurance', 'credit'], default: 'cash' },
        status: {
            type: String,
            enum: ['active', 'pending', 'disbursed', 'rejected', 'expired'],
            default: 'pending',
        },
        applicationDate: { type: Date },
        approvalDate: { type: Date },
        disbursementDate: { type: Date },
        expiryDate: { type: Date },
        description: { type: String },
        category: {
            type: String,
            enum: ['agriculture', 'education', 'housing', 'business', 'health', 'women'],
        },
        documents: [{ name: String, status: String }],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Subsidy', subsidySchema);
