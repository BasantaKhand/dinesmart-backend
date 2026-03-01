const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
    },
    restaurantName: {
        type: String,
        required: [true, 'Restaurant name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        required: [true, 'Phone is required'],
        trim: true,
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
    },
    onboardedAt: {
        type: Date,
    },
    inviteTokenHash: {
        type: String,
        select: false,
    },
    inviteSentAt: {
        type: Date,
    },
    inviteExpiresAt: {
        type: Date,
    },
    inviteAcceptedAt: {
        type: Date,
    },
    onboardingDetails: {
        restaurantAddress: {
            type: String,
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
    },
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
