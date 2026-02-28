const mongoose = require('mongoose');

const PaymentQueueSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'QR', 'CREDIT'],
      default: 'QR',
    },
    paymentProvider: {
      type: String,
      enum: ['ESEWA', 'STRIPE', 'MANUAL'],
      required: true,
    },
    paymentReference: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'FAILED'],
      default: 'PENDING',
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    lastRetryAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: '',
    },
    webhookResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: true,
    },
    manualOverride: {
      type: Boolean,
      default: false,
    },
    manualOverrideBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    manualOverrideReason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Index on restaurantId, status for quick lookups
PaymentQueueSchema.index({ restaurantId: 1, status: 1 });
PaymentQueueSchema.index({ restaurantId: 1, orderId: 1 });
PaymentQueueSchema.index({ restaurantId: 1, createdAt: -1 });
PaymentQueueSchema.index({ status: 1, retryCount: 1 }); // For bulk retry queries

module.exports = mongoose.model('PaymentQueue', PaymentQueueSchema);
