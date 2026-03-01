const { NotFoundError } = require('../../shared/errors');

class PaymentQueueUseCases {
  constructor({ paymentQueueRepository, paymentQueueService, auditUseCases }) {
    this.queueRepo = paymentQueueRepository;
    this.queueService = paymentQueueService;
    this.auditUseCases = auditUseCases;
  }

  async getQueueStatus(restaurantId) {
    return this.queueService.getPaymentQueueStatus(restaurantId);
  }

  async getFailedPayments(restaurantId, query = {}) {
    const { limit = 20, skip = 0 } = query;
    return this.queueService.getFailedPayments(restaurantId, parseInt(limit), parseInt(skip));
  }

  async manualOverridePayment(paymentId, user, reason) {
    const { restaurantId, id: userId } = user;

    const payment = await this.queueRepo.findById(paymentId);
    if (!payment || payment.restaurantId.toString() !== restaurantId.toString()) {
      throw new NotFoundError('Payment not found');
    }

    const result = await this.queueService.manualOverridePayment(paymentId, userId, reason);

    await this.auditUseCases.logTransaction({
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

    return result;
  }

  async retryAllFailedPayments(restaurantId) {
    return this.queueService.retryFailedPayments(restaurantId);
  }

  async getPaymentQueue(restaurantId, query = {}) {
    const { status, limit = 50, skip = 0 } = query;
    const filter = { restaurantId };
    if (status) filter.status = status;

    const payments = await this.queueRepo.find(filter, {
      populate: [{ path: 'orderId', select: 'orderNumber total items' }],
      sort: { createdAt: -1 },
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
    const total = await this.queueRepo.countDocuments(filter);
    return { payments, pagination: { total, limit: parseInt(limit), skip: parseInt(skip) } };
  }
}

module.exports = PaymentQueueUseCases;
