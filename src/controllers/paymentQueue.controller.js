const PaymentQueue = require('../models/PaymentQueue');
const paymentQueueService = require('../services/payment-queue.service');

/**
 * GET /api/payment-queue/status
 * Get payment queue status (pending, confirmed, failed counts)
 */
exports.getQueueStatus = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const status = await paymentQueueService.getPaymentQueueStatus(restaurantId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment queue status',
      error: error.message,
    });
  }
};

/**
 * GET /api/payment-queue/failed
 * Get all failed payments
 */
exports.getFailedPayments = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const { limit = 20, skip = 0 } = req.query;

    const result = await paymentQueueService.getFailedPayments(
      restaurantId,
      parseInt(limit),
      parseInt(skip)
    );

    res.json({
      success: true,
      data: result.payments,
      pagination: {
        total: result.total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  } catch (error) {
    console.error('Error fetching failed payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failed payments',
      error: error.message,
    });
  }
};

/**
 * POST /api/payment-queue/:paymentId/manual-override
 * Manually override a failed payment
 */
exports.manualOverridePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const { restaurantId, id: userId } = req.user;

    // Verify payment belongs to restaurant
    const payment = await PaymentQueue.findById(paymentId);
    if (!payment || payment.restaurantId.toString() !== restaurantId.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    const result = await paymentQueueService.manualOverridePayment(
      paymentId,
      userId,
      reason
    );

    // Log transaction (manual override)
    const auditControllerModule = require('./audit.controller');
    await auditControllerModule.logTransaction({
      restaurantId,
      cashierId: userId,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      type: 'PAYMENT_OVERRIDE',
      amount: result.amount,
      paymentMethod: result.paymentMethod,
      paymentProvider: result.paymentProvider,
      description: `Manual payment override: ${reason}`,
      metadata: { paymentReference: result.paymentReference },
    });

    res.json({
      success: true,
      message: 'Payment manually approved',
      data: result,
    });
  } catch (error) {
    console.error('Error manually overriding payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manually override payment',
      error: error.message,
    });
  }
};

/**
 * POST /api/payment-queue/retry-all
 * Retry all failed payments
 */
exports.retryAllFailedPayments = async (req, res) => {
  try {
    const { restaurantId } = req.user;

    const results = await paymentQueueService.retryFailedPayments(restaurantId);

    res.json({
      success: true,
      message: `Processed ${results.processed} payments`,
      data: results,
    });
  } catch (error) {
    console.error('Error retrying payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry payments',
      error: error.message,
    });
  }
};

/**
 * GET /api/payment-queue
 * Get all payments in queue (with optional filters)
 */
exports.getPaymentQueue = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const { status, limit = 50, skip = 0 } = req.query;

    const query = { restaurantId };
    if (status) {
      query.status = status;
    }

    const payments = await PaymentQueue.find(query)
      .populate('orderId', 'orderNumber total items')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await PaymentQueue.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  } catch (error) {
    console.error('Error fetching payment queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment queue',
      error: error.message,
    });
  }
};
