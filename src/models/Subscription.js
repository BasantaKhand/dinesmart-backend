const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        required: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'],
        default: 'PENDING',
    },
    startDate: {
        type: Date,
    },
    endDate: {
        type: Date,
    },
    // Payment details
    paymentMethod: {
        type: String,
        enum: ['ESEWA', 'MANUAL', 'FREE_TRIAL'],
        default: 'ESEWA',
    },
    // eSewa specific fields
    esewaTransactionId: {
        type: String,
    },
    esewaRefId: {
        type: String,
    },
    amountPaid: {
        type: Number,
        default: 0,
    },
    // Auto-renewal
    autoRenew: {
        type: Boolean,
        default: false,
    },
    // Tracking
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    activatedAt: {
        type: Date,
    },
});

// Update timestamp on save
subscriptionSchema.pre('save', function() {
    this.updatedAt = new Date();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
