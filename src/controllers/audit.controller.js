const TransactionLog = require('../models/TransactionLog');
const DailySettlement = require('../models/DailySettlement');
const Order = require('../models/Order');

/**
 * Log a transaction (internal helper)
 */
exports.logTransaction = async (logData) => {
  try {
    const log = new TransactionLog(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error logging transaction:', error);
  }
};

/**
 * GET /api/audit/transactions
 * Get transaction history
 */
exports.getTransactions = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const { limit = 50, skip = 0, type, cashierId, dateFrom, dateTo } = req.query;

    const query = { restaurantId };
    if (type) query.type = type;
    if (cashierId) query.cashierId = cashierId;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const transactions = await TransactionLog.find(query)
      .populate('cashierId', 'name email')
      .populate('orderId', 'orderNumber total')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await TransactionLog.countDocuments(query);

    res.json({
      success: true,
      data: transactions,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message,
    });
  }
};

/**
 * GET /api/audit/daily-settlement?date=2026-02-22
 * Get or generate daily settlement
 */
exports.getDailySettlement = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter required (YYYY-MM-DD format)',
      });
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Try to find existing settlement
    let settlement = await DailySettlement.findOne({
      restaurantId,
      date: { $gte: startDate, $lte: endDate },
    });

    if (!settlement) {
      // Generate new settlement based on that day's transactions
      settlement = await generateDailySettlement(restaurantId, startDate, endDate);
    }

    res.json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    console.error('Error fetching daily settlement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily settlement',
      error: error.message,
    });
  }
};

/**
 * Generate daily settlement from transactions
 */
async function generateDailySettlement(restaurantId, startDate, endDate) {
  try {
    // Get all payment transactions for the day
    const payments = await TransactionLog.find({
      restaurantId,
      type: 'PAYMENT_SETTLED',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Calculate totals by method
    const collectionByMethod = {
      cash: 0,
      card: 0,
      qr: 0,
      credit: 0,
    };

    payments.forEach((payment) => {
      const method = payment.paymentMethod?.toLowerCase() || 'cash';
      if (collectionByMethod.hasOwnProperty(method)) {
        collectionByMethod[method] += payment.amount;
      }
    });

    // Get drawer statistics
    const drawerLogs = await TransactionLog.find({
      restaurantId,
      type: { $in: ['DRAWER_OPENED', 'DRAWER_CLOSED'] },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Get failed payments count
    const failedPayments = await TransactionLog.countDocuments({
      restaurantId,
      type: 'PAYMENT_OVERRIDE',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Calculate totals
    const totalCollection = Object.values(collectionByMethod).reduce((sum, val) => sum + val, 0);
    const totalBills = payments.length;

    // Create settlement
    const settlement = new DailySettlement({
      restaurantId,
      date: startDate,
      totalBills,
      totalCollection,
      collectionByMethod,
      drawerOpenings: drawerLogs.filter((l) => l.type === 'DRAWER_OPENED').length,
      drawerVariance: drawerLogs.reduce((sum, log) => sum + (log.metadata?.variance || 0), 0),
      failedPayments,
      manualOverrides: failedPayments,
    });

    await settlement.save();
    return settlement;
  } catch (error) {
    console.error('Error generating daily settlement:', error);
    throw error;
  }
}

/**
 * GET /api/audit/my-transactions
 * Get current user's transaction history
 */
exports.getMyTransactions = async (req, res) => {
  try {
    const { restaurantId, id: userId } = req.user;
    const { limit = 20, skip = 0 } = req.query;

    const transactions = await TransactionLog.find({
      restaurantId,
      cashierId: userId,
    })
      .populate('orderId', 'orderNumber total')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await TransactionLog.countDocuments({
      restaurantId,
      cashierId: userId,
    });

    // Calculate summary for user
    const summary = {
      totalPaymentsSettled: 0,
      totalAmountSettled: 0,
      drawerSessions: 0,
    };

    transactions.forEach((t) => {
      if (t.type === 'PAYMENT_SETTLED') {
        summary.totalPaymentsSettled++;
        summary.totalAmountSettled += t.amount;
      }
      if (t.type === 'DRAWER_OPENED') {
        summary.drawerSessions++;
      }
    });

    res.json({
      success: true,
      data: transactions,
      summary,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) },
    });
  } catch (error) {
    console.error('Error fetching my transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your transactions',
      error: error.message,
    });
  }
};

/**
 * GET /api/audit/settlements
 * Get all daily settlements for restaurant
 */
exports.getSettlements = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const { limit = 30, skip = 0 } = req.query;

    const settlements = await DailySettlement.find({ restaurantId })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await DailySettlement.countDocuments({ restaurantId });

    res.json({
      success: true,
      data: settlements,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) },
    });
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settlements',
      error: error.message,
    });
  }
};
