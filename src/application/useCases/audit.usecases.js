const mongoose = require('mongoose');

class AuditUseCases {
  constructor({ transactionLogRepository, dailySettlementRepository, orderRepository }) {
    this.txLogRepo = transactionLogRepository;
    this.dailySettlementRepo = dailySettlementRepository;
    this.orderRepo = orderRepository;
  }

  async logTransaction(logData) {
    try {
      return await this.txLogRepo.create(logData);
    } catch (error) {
      console.error('Error logging transaction:', error);
    }
  }

  async getTransactions(restaurantId, query = {}) {
    const { limit = 50, skip = 0, type, cashierId, dateFrom, dateTo } = query;
    const filter = { restaurantId };
    if (type) filter.type = type;
    if (cashierId) filter.cashierId = cashierId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59, 999); filter.createdAt.$lte = end; }
    }

    const transactions = await this.txLogRepo.find(filter, {
      populate: [{ path: 'cashierId', select: 'name email' }, { path: 'orderId', select: 'orderNumber total' }],
      sort: { createdAt: -1 }, limit: parseInt(limit), skip: parseInt(skip),
    });
    const total = await this.txLogRepo.countDocuments(filter);
    return { transactions, pagination: { total, limit: parseInt(limit), skip: parseInt(skip) } };
  }

  async getDailySettlement(restaurantId, date) {
    const startDate = new Date(date); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date); endDate.setHours(23, 59, 59, 999);
    return this._generateDailySettlement(restaurantId, startDate, endDate);
  }

  async _generateDailySettlement(restaurantId, startDate, endDate) {
    const dateFilter = { restaurantId, createdAt: { $gte: startDate, $lte: endDate } };
    const payments = await this.txLogRepo.find({ ...dateFilter, type: 'PAYMENT_SETTLED' });

    const collectionByMethod = { cash: 0, card: 0, qr: 0, credit: 0 };
    payments.forEach((p) => {
      const method = p.paymentMethod?.toLowerCase() || 'cash';
      if (collectionByMethod.hasOwnProperty(method)) collectionByMethod[method] += p.amount;
    });

    const drawerLogs = await this.txLogRepo.find({
      ...dateFilter, type: { $in: ['DRAWER_OPENED', 'DRAWER_CLOSED'] },
    });
    const failedPayments = await this.txLogRepo.countDocuments({ ...dateFilter, type: 'PAYMENT_OVERRIDE' });
    const totalCollection = Object.values(collectionByMethod).reduce((s, v) => s + v, 0);

    return this.dailySettlementRepo.findOneAndUpdate(
      { restaurantId, date: { $gte: startDate, $lte: endDate } },
      {
        restaurantId, date: startDate, totalBills: payments.length, totalCollection,
        collectionByMethod,
        drawerOpenings: drawerLogs.filter((l) => l.type === 'DRAWER_OPENED').length,
        drawerVariance: drawerLogs.reduce((sum, log) => sum + (log.metadata?.variance || 0), 0),
        failedPayments, manualOverrides: failedPayments,
      }
    );
  }

  async getMyTransactions(restaurantId, userId, query = {}) {
    const { limit = 20, skip = 0 } = query;
    const filter = { restaurantId, cashierId: userId };

    const transactions = await this.txLogRepo.find(filter, {
      populate: [{ path: 'orderId', select: 'orderNumber total' }],
      sort: { createdAt: -1 }, limit: parseInt(limit), skip: parseInt(skip),
    });
    const total = await this.txLogRepo.countDocuments(filter);

    const summary = { totalPaymentsSettled: 0, totalAmountSettled: 0, drawerSessions: 0 };
    transactions.forEach((t) => {
      if (t.type === 'PAYMENT_SETTLED') { summary.totalPaymentsSettled++; summary.totalAmountSettled += t.amount; }
      if (t.type === 'DRAWER_OPENED') summary.drawerSessions++;
    });

    return { transactions, summary, pagination: { total, limit: parseInt(limit), skip: parseInt(skip) } };
  }

  async getSettlements(restaurantId, query = {}) {
    const { limit = 30, skip = 0 } = query;
    const settlements = await this.dailySettlementRepo.find(
      { restaurantId }, { sort: { date: -1 }, limit: parseInt(limit), skip: parseInt(skip) }
    );
    const total = await this.dailySettlementRepo.countDocuments({ restaurantId });
    return { settlements, pagination: { total, limit: parseInt(limit), skip: parseInt(skip) } };
  }
}

module.exports = AuditUseCases;
