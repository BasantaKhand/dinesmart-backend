const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        index: true,
    },
    type: {
        type: String,
        enum: [
            'CONTACT_MESSAGE', 'ORDER_ALERT', 'SYSTEM_ALERT', 'PAYMENT_ALERT', 
            'REPORT_GENERATED', 'PAYMENT_VERIFIED',
            // New types
            'ORDER_READY', 'ORDER_SERVED', 'NEW_ORDER', 'BILL_PRINTED', 
            'PAYMENT_PENDING', 'ORDER_COMPLETED', 'TABLE_READY', 'ORDER_STATUS_UPDATE'
        ],
        required: true,
        index: true,
    },
    recipients: {
        type: [String],
        enum: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'ADMIN', 'WAITER', 'CASHIER', 'KITCHEN'],
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
    },
    status: {
        type: String,
        enum: ['UNREAD', 'READ', 'ARCHIVED'],
        default: 'UNREAD',
        index: true,
    },
    actionUrl: {
        type: String,
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM',
    },
    readBy: [{
        user: mongoose.Schema.Types.ObjectId,
        readAt: Date,
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    expiresAt: {
        type: Date,
    },
}, { timestamps: true });

// TTL index for auto-deletion (default 30 days)
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create indexes for common queries
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ recipients: 1, status: 1, createdAt: -1 });
notificationSchema.index({ restaurantId: 1, recipients: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
