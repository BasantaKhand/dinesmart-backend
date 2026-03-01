const mongoose = require('mongoose');

const checkoutSessionSchema = new mongoose.Schema({
    // Contact info
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone is required'],
        trim: true
    },
    
    // Plan selection
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        required: true
    },
    
    // Session status
    status: {
        type: String,
        enum: ['PAYMENT_PENDING', 'VERIFIED', 'ACTIVATED', 'EXPIRED', 'FAILED'],
        default: 'PAYMENT_PENDING'
    },
    
    // Payment details
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'NPR'
    },
    
    // eSewa transaction details
    transactionId: {
        type: String,
        unique: true,
        sparse: true
    },
    esewaRefId: String,
    esewaSignature: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    
    // Activation token (generated when superadmin approves)
    activationToken: {
        type: String,
        unique: true,
        sparse: true
    },
    activationTokenExpiry: Date,
    
    // References after activation
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    },
    
    // Timestamps
    verifiedAt: Date,
    activatedAt: Date,
    inviteSentAt: Date,
    completedAt: Date,
    
    // Notes for superadmin
    adminNotes: String
}, {
    timestamps: true
});

// Indexes (transactionId and activationToken already indexed via unique: true)
checkoutSessionSchema.index({ email: 1 });
checkoutSessionSchema.index({ status: 1 });
checkoutSessionSchema.index({ createdAt: -1 });

// Virtual for display
checkoutSessionSchema.virtual('isExpired').get(function() {
    if (this.activationTokenExpiry) {
        return new Date() > this.activationTokenExpiry;
    }
    return false;
});

module.exports = mongoose.model('CheckoutSession', checkoutSessionSchema);
