const mongoose = require('mongoose');

const DailySettlementSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    totalBills: {
      type: Number,
      default: 0,
    },
    totalCollection: {
      type: Number,
      default: 0,
    },
    collectionByMethod: {
      cash: { type: Number, default: 0 },
      card: { type: Number, default: 0 },
      qr: { type: Number, default: 0 },
      credit: { type: Number, default: 0 },
    },
    drawerOpenings: {
      type: Number,
      default: 0,
    },
    drawerVariance: {
      type: Number,
      default: 0,
    },
    failedPayments: {
      type: Number,
      default: 0,
    },
    manualOverrides: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure one settlement per restaurant per day
DailySettlementSchema.index({ restaurantId: 1, date: 1 }, { unique: true });
DailySettlementSchema.index({ restaurantId: 1, createdAt: -1 });

module.exports = mongoose.model('DailySettlement', DailySettlementSchema);
