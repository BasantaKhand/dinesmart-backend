const mongoose = require('mongoose');

class DashboardUseCases {
  constructor({ orderRepository, menuItemRepository, tableRepository }) {
    this.orderRepo = orderRepository;
    this.menuItemRepo = menuItemRepository;
    this.tableRepo = tableRepository;
  }

  _getDateRange(days) {
    const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 90) : 30;
    const endDate = new Date(); endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (safeDays - 1));
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate, days: safeDays };
  }

  async getDashboardOverview(restaurantId, daysParam) {
    const { startDate, endDate, days } = this._getDateRange(daysParam || 30);
    const baseMatch = {
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'CANCELLED' },
    };

    const [totalOrders, paidStats, ordersForCustomers] = await Promise.all([
      this.orderRepo.countDocuments(baseMatch),
      this.orderRepo.aggregate([
        { $match: { ...baseMatch, paymentStatus: 'PAID' } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' }, paidOrders: { $sum: 1 } } },
      ]),
      this.orderRepo.find(baseMatch, { select: 'orderType tableId', lean: true }),
    ]);

    const paidOrders = paidStats[0]?.paidOrders || 0;
    const totalRevenue = paidStats[0]?.totalRevenue || 0;

    const uniqueTables = new Set(
      ordersForCustomers.filter((o) => o.orderType === 'DINE_IN' && o.tableId).map((o) => String(o.tableId))
    );
    const nonDineInCount = ordersForCustomers.filter((o) => o.orderType !== 'DINE_IN').length;
    const customersCount = uniqueTables.size + nonDineInCount;

    const productsCount = await this.menuItemRepo.countDocuments({ restaurantId });
    const tablesTotal = await this.tableRepo.countDocuments({ restaurantId });
    const occupiedTables = await this.tableRepo.countDocuments({ restaurantId, status: 'OCCUPIED' });

    return { days, totalRevenue, totalOrders, paidOrders, productsCount, customersCount, tablesTotal, occupiedTables };
  }

  async getSalesOverview(restaurantId, daysParam) {
    const { startDate, endDate, days } = this._getDateRange(daysParam || 30);
    const results = await this.orderRepo.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'PAID', status: { $ne: 'CANCELLED' },
        },
      },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$total' } } },
      { $sort: { _id: 1 } },
    ]);
    return { data: results.map((item) => ({ date: item._id, total: item.total })), meta: { days } };
  }

  async getCategorySales(restaurantId, daysParam) {
    const { startDate, endDate, days } = this._getDateRange(daysParam || 30);
    const results = await this.orderRepo.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'PAID', status: { $ne: 'CANCELLED' },
        },
      },
      { $unwind: '$items' },
      { $lookup: { from: 'menuitems', localField: 'items.menuItemId', foreignField: '_id', as: 'menuItem' } },
      { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'categories', localField: 'menuItem.categoryId', foreignField: '_id', as: 'category' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$category.name', 'Uncategorized'] }, value: { $sum: '$items.total' } } },
      { $sort: { value: -1 } },
    ]);
    return { data: results.map((item) => ({ name: item._id, value: item.value })), meta: { days } };
  }
}

module.exports = DashboardUseCases;
