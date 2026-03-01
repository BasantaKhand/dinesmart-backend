const mongoose = require('mongoose');

const restaurantInquirySchema = new mongoose.Schema({
    // Owner information
    ownerName: {
        type: String,
        required: [true, 'Owner name is required'],
        trim: true,
    },
    ownerEmail: {
        type: String,
        required: [true, 'Owner email is required'],
        trim: true,
        lowercase: true,
    },
    ownerPhone: {
        type: String,
        required: [true, 'Owner phone is required'],
        trim: true,
    },

    // Restaurant information
    restaurantName: {
        type: String,
        required: [true, 'Restaurant name is required'],
        trim: true,
    },
    restaurantAddress: {
        type: String,
        required: [true, 'Restaurant address is required'],
        trim: true,
    },
    restaurantPhone: {
        type: String,
        trim: true,
    },
    cuisineType: {
        type: String,
        trim: true,
    },
    numberOfTables: {
        type: Number,
        min: 1,
    },

    // Message
    message: {
        type: String,
        trim: true,
    },

    // Status
    status: {
        type: String,
        enum: ['PENDING', 'CONTACTED', 'ONBOARDED', 'REJECTED'],
        default: 'PENDING',
    },

    // Onboarding details (filled when onboarded)
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
    },
    tempUsername: {
        type: String,
    },
    tempPassword: {
        type: String,
        select: false, // Don't include by default
    },
    credentialsSentAt: {
        type: Date,
    },
    contactedAt: {
        type: Date,
    },
    onboardedAt: {
        type: Date,
    },
    // Selected subscription plan
    selectedPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
    },
    // Payment token for secure payment link
    paymentToken: {
        type: String,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('RestaurantInquiry', restaurantInquirySchema);
