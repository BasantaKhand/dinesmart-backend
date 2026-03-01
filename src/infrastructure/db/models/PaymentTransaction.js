const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
    },
    // Transaction details
    transactionId: {
        type: String,
        required: true,
        unique: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'NPR',
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
        default: 'PENDING',
    },
    // Payment gateway details
    paymentGateway: {
        type: String,
        enum: ['ESEWA', 'MANUAL'],
        required: true,
    },
    gatewayResponse: {
        type: mongoose.Schema.Types.Mixed,
    },
    // eSewa specific
    esewaProductCode: {
        type: String,
    },
    esewaSignedFieldNames: {
        type: String,
    },
    esewaSignature: {
        type: String,
    },
    // Purpose
    purpose: {
        type: String,
        enum: ['SUBSCRIPTION', 'RENEWAL'],
        default: 'SUBSCRIPTION',
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: {
        type: Date,
    },
});

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
