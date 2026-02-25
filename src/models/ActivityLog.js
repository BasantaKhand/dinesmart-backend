const mongoose = require('mongoose');

/**
 * ActivityLog - System-wide activity tracking for superadmin dashboard
 * Tracks important platform events like logins, status changes, registrations, etc.
 */
const ActivityLogSchema = new mongoose.Schema(
  {
    // Activity type categorization
    type: {
      type: String,
      enum: [
        // Authentication events
        'USER_LOGIN',
        'USER_LOGOUT',
        'USER_REGISTERED',
        'PASSWORD_RESET',
        'LOGIN_FAILED',
        'PROFILE_UPDATED',
        // Restaurant events
        'RESTAURANT_CREATED',
        'RESTAURANT_ACTIVATED',
        'RESTAURANT_SUSPENDED',
        'RESTAURANT_DELETED',
        // User management events
        'STAFF_INVITED',
        'STAFF_REMOVED',
        'ROLE_CHANGED',
        // Subscription events
        'SUBSCRIPTION_CREATED',
        'SUBSCRIPTION_ACTIVATED',
        'SUBSCRIPTION_EXPIRED',
        'PAYMENT_RECEIVED',
        // System events
        'SYSTEM_ERROR',
        'API_ERROR',
        'DATABASE_ERROR',
        // Data events
        'MENU_UPDATED',
        'TABLE_CREATED',
        'ORDER_PLACED',
      ],
      required: true,
    },
    // Severity level
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
      default: 'INFO',
    },
    // Human-readable description
    message: {
      type: String,
      required: true,
    },
    // Actor who performed the action (if applicable)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userEmail: {
      type: String,
      default: null,
    },
    userName: {
      type: String,
      default: null,
    },
    userRole: {
      type: String,
      default: null,
    },
    // Related restaurant (if applicable)
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
    },
    restaurantName: {
      type: String,
      default: null,
    },
    // IP address for security tracking
    ipAddress: {
      type: String,
      default: null,
    },
    // User agent for device tracking
    userAgent: {
      type: String,
      default: null,
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ type: 1, createdAt: -1 });
ActivityLogSchema.index({ severity: 1, createdAt: -1 });
ActivityLogSchema.index({ restaurantId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });

// Static method to log activity
ActivityLogSchema.statics.log = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
