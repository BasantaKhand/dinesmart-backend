const mongoose = require('mongoose');
const CashDrawer = require('../models/CashDrawer');
const Order = require('../models/Order');

/**
 * Open cash drawer (log opening amount and timestamp)
 */
exports.openDrawer = async (req, res) => {
  try {
    const { openingAmount, notes } = req.body;
    const restaurantId = req.user.restaurantId;
    const userId = req.user.id || req.user._id;

    // Check if drawer is already open
    const activeDrawer = await CashDrawer.findOne({
      restaurantId,
      status: 'OPEN',
    });

    if (activeDrawer) {
      return res.status(400).json({
        success: false,
        message: 'Cash drawer is already open',
      });
    }

    // Create new drawer record
    const drawer = new CashDrawer({
      restaurantId,
      cashierId: userId,
      status: 'OPEN',
      openedAt: new Date(),
      openingAmount: openingAmount || 0,
      notes: notes || '',
    });

    await drawer.save();

    // Log transaction
    const auditControllerModule = require('./audit.controller');
    await auditControllerModule.logTransaction({
      restaurantId,
      cashierId: userId,
      type: 'DRAWER_OPENED',
      amount: openingAmount || 0,
      description: `Cash drawer opened with ₨${openingAmount?.toLocaleString() || '0'}`,
      metadata: { notes },
    });

    res.json({
      success: true,
      message: 'Cash drawer opened',
      data: drawer,
    });
  } catch (error) {
    console.error('Error opening drawer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to open cash drawer',
      error: error.message,
    });
  }
};

/**
 * Close cash drawer (calculate variance)
 */
exports.closeDrawer = async (req, res) => {
  try {
    const { closingAmount, notes } = req.body;
    const restaurantId = req.user.restaurantId;

    // Find open drawer
    const drawer = await CashDrawer.findOne({
      restaurantId,
      status: 'OPEN',
    });

    if (!drawer) {
      return res.status(404).json({
        success: false,
        message: 'No open cash drawer found',
      });
    }

    // Calculate expected amount: opening + cash transactions since opening
    const expectedAmount = await calculateExpectedAmount(restaurantId, drawer.openedAt);

    // Calculate variance
    const variance = closingAmount - expectedAmount;

    // Update drawer
    drawer.status = 'CLOSED';
    drawer.closedAt = new Date();
    drawer.closingAmount = closingAmount;
    drawer.expectedAmount = expectedAmount;
    drawer.variance = variance;
    drawer.notes = notes || drawer.notes;

    await drawer.save();

    // Log transaction
    const auditControllerModule = require('./audit.controller');
    await auditControllerModule.logTransaction({
      restaurantId,
      cashierId: drawer.cashierId,
      type: 'DRAWER_CLOSED',
      amount: closingAmount,
      description: `Cash drawer closed. Expected: ₨${expectedAmount.toLocaleString()}, Actual: ₨${closingAmount.toLocaleString()}, Variance: ₨${variance.toLocaleString()}`,
      metadata: {
        openingAmount: drawer.openingAmount,
        closingAmount,
        expectedAmount,
        variance,
        notes,
      },
    });

    res.json({
      success: true,
      message: 'Cash drawer closed',
      data: drawer,
    });
  } catch (error) {
    console.error('Error closing drawer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close cash drawer',
      error: error.message,
    });
  }
};

/**
 * Get current drawer status
 */
exports.getDrawerStatus = async (req, res) => {
  try {
    const { restaurantId } = req.user;

    const drawer = await CashDrawer.findOne({
      restaurantId,
      status: 'OPEN',
    }).populate('cashierId', 'name email');

    if (!drawer) {
      return res.json({
        success: true,
        data: null,
        message: 'No open drawer',
      });
    }

    res.json({
      success: true,
      data: drawer,
    });
  } catch (error) {
    console.error('Error fetching drawer status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drawer status',
      error: error.message,
    });
  }
};

/**
 * Get drawer history
 */
exports.getDrawerHistory = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const { limit = 10, skip = 0 } = req.query;

    const drawers = await CashDrawer.find({ restaurantId })
      .populate('cashierId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CashDrawer.countDocuments({ restaurantId });

    res.json({
      success: true,
      data: drawers,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  } catch (error) {
    console.error('Error fetching drawer history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drawer history',
      error: error.message,
    });
  }
};

/**
 * Calculate total cash collected since drawer opened
 * (sum of orders with PAID status and CASH payment method after drawer opened)
 */
async function calculateExpectedAmount(restaurantId, drawerOpenedAt) {
  const cashOrders = await Order.aggregate([
    {
      $match: {
        restaurantId: mongoose.Types.ObjectId(restaurantId),
        paymentProvider: 'MANUAL', // CASH payments are MANUAL
        status: 'PAID',
        updatedAt: { $gte: drawerOpenedAt },
      },
    },
    {
      $group: {
        _id: null,
        totalCash: { $sum: '$totalAmount' },
      },
    },
  ]);

  return cashOrders.length > 0 ? cashOrders[0].totalCash : 0;
}
