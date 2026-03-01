const mongoose = require('mongoose');

const CashDrawerSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['OPEN', 'CLOSED'],
      default: 'CLOSED',
    },
    openedAt: {
      type: Date,
      default: null,
    },
    openingAmount: {
      type: Number,
      default: 0,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closingAmount: {
      type: Number,
      default: 0,
    },
    expectedAmount: {
      type: Number,
      default: 0,
    },
    variance: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    transactionsHandled: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index on restaurantId and status for quick lookups
CashDrawerSchema.index({ restaurantId: 1, status: 1 });
CashDrawerSchema.index({ restaurantId: 1, createdAt: -1 });

module.exports = mongoose.model('CashDrawer', CashDrawerSchema);
