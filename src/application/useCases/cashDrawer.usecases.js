const mongoose = require('mongoose');
const { ValidationError, NotFoundError } = require('../../shared/errors');

class CashDrawerUseCases {
  constructor({ cashDrawerRepository, orderRepository, transactionLogRepository }) {
    this.drawerRepo = cashDrawerRepository;
    this.orderRepo = orderRepository;
    this.txLogRepo = transactionLogRepository;
  }

  async openDrawer({ openingAmount, notes }, user) {
    const restaurantId = user.restaurantId;
    const userId = user.id || user._id;

    const activeDrawer = await this.drawerRepo.findOne({ restaurantId, status: 'OPEN' });
    if (activeDrawer) throw new ValidationError('Cash drawer is already open');

    const drawer = await this.drawerRepo.create({
      restaurantId, cashierId: userId, status: 'OPEN',
      openedAt: new Date(), openingAmount: openingAmount || 0, notes: notes || '',
    });

    await this.txLogRepo.create({
      restaurantId, cashierId: userId, type: 'DRAWER_OPENED',
      amount: openingAmount || 0,
      description: `Cash drawer opened with ₨${openingAmount?.toLocaleString() || '0'}`,
      metadata: { notes },
    });

    return drawer;
  }

  async closeDrawer({ closingAmount, notes }, user) {
    const restaurantId = user.restaurantId;
    const drawer = await this.drawerRepo.findOne({ restaurantId, status: 'OPEN' });
    if (!drawer) throw new NotFoundError('No open cash drawer found');

    const expectedAmount = await this._calculateExpectedAmount(restaurantId, drawer.openedAt);
    const variance = closingAmount - expectedAmount;

    drawer.status = 'CLOSED';
    drawer.closedAt = new Date();
    drawer.closingAmount = closingAmount;
    drawer.expectedAmount = expectedAmount;
    drawer.variance = variance;
    drawer.notes = notes || drawer.notes;
    await this.drawerRepo.save(drawer);

    await this.txLogRepo.create({
      restaurantId, cashierId: drawer.cashierId, type: 'DRAWER_CLOSED',
      amount: closingAmount,
      description: `Cash drawer closed. Expected: ₨${expectedAmount.toLocaleString()}, Actual: ₨${closingAmount.toLocaleString()}, Variance: ₨${variance.toLocaleString()}`,
      metadata: { openingAmount: drawer.openingAmount, closingAmount, expectedAmount, variance, notes },
    });

    return drawer;
  }

  async getDrawerStatus(restaurantId) {
    return this.drawerRepo.findOne(
      { restaurantId, status: 'OPEN' },
      { populate: [{ path: 'cashierId', select: 'name email' }] }
    );
  }

  async getDrawerHistory(restaurantId, query = {}) {
    const { limit = 10, skip = 0 } = query;
    const drawers = await this.drawerRepo.find(
      { restaurantId },
      { populate: [{ path: 'cashierId', select: 'name email' }], sort: { createdAt: -1 }, limit: parseInt(limit), skip: parseInt(skip) }
    );
    const total = await this.drawerRepo.countDocuments({ restaurantId });
    return { drawers, pagination: { total, limit: parseInt(limit), skip: parseInt(skip) } };
  }

  async _calculateExpectedAmount(restaurantId, drawerOpenedAt) {
    const cashOrders = await this.orderRepo.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          paymentMethod: 'CASH', paymentStatus: 'PAID',
          updatedAt: { $gte: drawerOpenedAt },
        },
      },
      { $group: { _id: null, totalCash: { $sum: '$total' } } },
    ]);
    return cashOrders.length > 0 ? cashOrders[0].totalCash : 0;
  }
}

module.exports = CashDrawerUseCases;
