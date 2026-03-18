const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank', required: true },
        loanType: {
            type: String,
            enum: ['kcc', 'agriculture', 'smallBusiness', 'personal', 'housing'],
            required: true,
        },
        loanNumber: { type: String, unique: true },
        principalAmount: { type: Number, required: true },
        outstandingAmount: { type: Number },
        interestRate: { type: Number },
        tenure: { type: Number }, // in months
        emiAmount: { type: Number },
        disbursedDate: { type: Date },
        dueDate: { type: Date },
        nextEmiDate: { type: Date },
        status: {
            type: String,
            enum: ['approved', 'pending', 'eligible', 'rejected', 'closed'],
            default: 'pending',
        },
        purpose: { type: String },
        collateral: { type: String },
        subType: { type: String }, // e.g., crop loan, dairy, etc.
        notes: { type: String },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Loan', loanSchema);
