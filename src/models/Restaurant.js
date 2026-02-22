const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Restaurant name is required'],
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    paymentSettings: {
        provider: {
            type: String,
            enum: ['ESEWA', 'STRIPE', 'MANUAL'],
            default: 'MANUAL'
        },
        qrCodeUrl: {
            type: String,
            trim: true
        },
        accountName: {
            type: String,
            trim: true
        },
        accountId: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            trim: true
        }
    },
    status: {
        type: String,
        enum: ['PENDING', 'ACTIVE', 'SUSPENDED'],
        default: 'PENDING',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
