const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Plan name is required'],
        trim: true,
        unique: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    description: {
        type: String,
        trim: true,
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: 0,
    },
    currency: {
        type: String,
        default: 'NPR',
    },
    billingCycle: {
        type: String,
        enum: ['MONTHLY', 'YEARLY'],
        default: 'MONTHLY',
    },
    features: [{
        type: String,
        trim: true,
    }],
    limits: {
        maxTables: {
            type: Number,
            default: -1, // -1 means unlimited
        },
        maxStaff: {
            type: Number,
            default: -1,
        },
        maxMenuItems: {
            type: Number,
            default: -1,
        },
        maxOrdersPerMonth: {
            type: Number,
            default: -1,
        },
    },
    isPopular: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    sortOrder: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
