const mongoose = require('mongoose');

const TransactionLogSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    orderNumber: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['PAYMENT_SETTLED', 'DRAWER_OPENED', 'DRAWER_CLOSED', 'PAYMENT_OVERRIDE', 'MANUAL_ADJUSTMENT'],
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'QR', 'CREDIT'],
      default: null,
    },
    paymentProvider: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    tableNumber: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for fast queries
TransactionLogSchema.index({ restaurantId: 1, createdAt: -1 });
TransactionLogSchema.index({ restaurantId: 1, cashierId: 1, createdAt: -1 });
TransactionLogSchema.index({ restaurantId: 1, type: 1 });
TransactionLogSchema.index({ createdAt: 1 }); // For daily settlement queries

module.exports = mongoose.model('TransactionLog', TransactionLogSchema);
