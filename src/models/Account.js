const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    description: { type: String },
    amount: { type: Number },
    type: { type: String, enum: ['credit', 'debit'] },
    balance: { type: Number },
    reference: { type: String },
});

const accountSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank', required: true },
        accountNumber: { type: String, required: true, unique: true },
        accountType: {
            type: String,
            enum: ['savings', 'current', 'fd', 'rd'],
            default: 'savings',
        },
        balance: { type: Number, default: 0 },
        availableBalance: { type: Number, default: 0 },
        ifscCode: { type: String },
        branchName: { type: String },
        holderName: { type: String },
        isActive: { type: Boolean, default: true },
        transactions: [transactionSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Account', accountSchema);
