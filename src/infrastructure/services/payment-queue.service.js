const PaymentQueue = require('../db/models/PaymentQueue');
const Order = require('../db/models/Order');
const Table = require('../db/models/Table');
const NotificationService = require('./notification.service');

/**
 * Retry failed payments in queue
 * Called periodically (e.g., every 5 minutes) to retry FAILED payments
 */
exports.retryFailedPayments = async (restaurantId) => {
  try {
    // Find all failed payments that haven't exceeded max retries
    const failedPayments = await PaymentQueue.find({
      restaurantId,
      status: 'FAILED',
      retryCount: { $lt: 3 }, // Max 3 retries
    });

    const results = {
      processed: 0,
      confirmed: 0,
      stillFailed: 0,
    };

    for (const payment of failedPayments) {
      results.processed++;

      try {
        // For now, attempt to confirm based on manual override or retry logic
        // In production, this would call the payment gateway API to verify status
        if (payment.manualOverride) {
          // Manual override confirmed, mark order as paid
          payment.status = 'CONFIRMED';
          await payment.save();

          // Update order status
          await Order.findByIdAndUpdate(payment.orderId, {
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            paymentProvider: payment.paymentProvider,
            paymentReference: payment.paymentReference,
          });

          // Release table
          await Table.findByIdAndUpdate(
            (await Order.findById(payment.orderId))?.tableId,
            { status: 'AVAILABLE' }
          );

          results.confirmed++;
        } else {
          // Increment retry count
          payment.retryCount += 1;
          payment.lastRetryAt = new Date();

          // If max retries exceeded, keep as FAILED
          if (payment.retryCount >= payment.maxRetries) {
            payment.status = 'FAILED';
            results.stillFailed++;
          } else {
            // Retry logic would go here (e.g., call payment gateway)
            payment.status = 'PENDING'; // Reset to pending for next attempt
          }

          await payment.save();
        }
      } catch (error) {
        console.error(`Error processing payment ${payment._id}:`, error);
        results.stillFailed++;
      }
    }

    return results;
  } catch (error) {
    console.error('Error retrying failed payments:', error);
    throw error;
  }
};

/**
 * Queue a payment for verification
 * Called when a payment is submitted
 */
exports.queuePayment = async (orderData) => {
  try {
    const {
      restaurantId,
      orderId,
      orderNumber,
      amount,
      paymentMethod,
      paymentProvider,
      paymentReference,
    } = orderData;

    const payment = new PaymentQueue({
      restaurantId,
      orderId,
      orderNumber,
      amount,
      paymentMethod,
      paymentProvider,
      paymentReference,
      status: 'PENDING',
      isOnline: navigator?.onLine !== false, // Simple check
    });

    await payment.save();
    return payment;
  } catch (error) {
    console.error('Error queuing payment:', error);
    throw error;
  }
};

/**
 * Manually override a failed payment
 * Allow cashier to mark order as paid if payment gateway fails
 */
exports.manualOverridePayment = async (paymentId, userId, reason) => {
  try {
    const payment = await PaymentQueue.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.manualOverride = true;
    payment.manualOverrideBy = userId;
    payment.manualOverrideReason = reason;
    payment.status = 'CONFIRMED';

    await payment.save();

    // Update order and release table
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.status = 'COMPLETED';
      order.paymentStatus = 'PAID';
      await order.save();

      if (order.tableId) {
        await Table.findByIdAndUpdate(order.tableId, { status: 'AVAILABLE' });
      }
    }

    return payment;
  } catch (error) {
    console.error('Error manually overriding payment:', error);
    throw error;
  }
};

/**
 * Get payment queue status for restaurant
 */
exports.getPaymentQueueStatus = async (restaurantId) => {
  try {
    const [pending, confirmed, failed] = await Promise.all([
      PaymentQueue.countDocuments({ restaurantId, status: 'PENDING' }),
      PaymentQueue.countDocuments({ restaurantId, status: 'CONFIRMED' }),
      PaymentQueue.countDocuments({ restaurantId, status: 'FAILED' }),
    ]);

    return { pending, confirmed, failed };
  } catch (error) {
    console.error('Error getting payment queue status:', error);
    throw error;
  }
};

/**
 * Get all failed payments for a restaurant
 */
exports.getFailedPayments = async (restaurantId, limit = 20, skip = 0) => {
  try {
    const payments = await PaymentQueue.find({
      restaurantId,
      status: 'FAILED',
    })
      .populate('orderId', 'orderNumber total items')
      .populate('manualOverrideBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await PaymentQueue.countDocuments({
      restaurantId,
      status: 'FAILED',
    });

    return { payments, total };
  } catch (error) {
    console.error('Error getting failed payments:', error);
    throw error;
  }
};
