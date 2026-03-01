const { NotFoundError, ValidationError } = require('../../shared/errors');

class PaymentUseCases {
  constructor({ orderRepository, tableRepository, notificationService }) {
    this.orderRepo = orderRepository;
    this.tableRepo = tableRepository;
    this.notificationService = notificationService;
  }

  async handleEsewaWebhook(body, io) {
    const { orderNumber, transactionId, amount, status } = body || {};
    if (!orderNumber || !transactionId) throw new ValidationError('Missing orderNumber or transactionId');
    if (status && status !== 'SUCCESS') return { message: 'Payment not successful' };

    const order = await this.orderRepo.findOne({ orderNumber });
    if (!order) throw new NotFoundError('Order not found');
    if (amount && Number(amount) !== Number(order.total)) throw new ValidationError('Amount mismatch');

    order.paymentStatus = 'PAID';
    order.paymentMethod = 'QR';
    order.paymentProvider = 'ESEWA';
    order.paymentReference = transactionId;
    order.status = 'COMPLETED';
    await this.orderRepo.save(order);

    if (order.tableId) {
      await this.tableRepo.findByIdAndUpdate(order.tableId, { status: 'AVAILABLE' });
    }

    await this.notificationService.notifyPaymentCompleted(order, 'QR', io);
    return order;
  }
}

module.exports = PaymentUseCases;
