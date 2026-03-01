const mongoose = require('mongoose');

class SuperadminUseCases {
  constructor({
    restaurantRepository,
    userRepository,
    orderRepository,
    menuItemRepository,
    tableRepository,
    subscriptionRepository,
    activityLogRepository,
    transactionLogRepository,
  }) {
    this.restaurantRepo = restaurantRepository;
    this.userRepo = userRepository;
    this.orderRepo = orderRepository;
    this.menuItemRepo = menuItemRepository;
    this.tableRepo = tableRepository;
    this.subscriptionRepo = subscriptionRepository;
    this.activityLogRepo = activityLogRepository;
    this.txLogRepo = transactionLogRepository;
  }

  async getSystemAnalytics(daysParam) {
    const days = parseInt(daysParam) || 30;
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - days);
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days * 2);
    const previousPeriodEnd = new Date(currentPeriodStart);

    const calcGrowth = (cur, prev) => (prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100);

    const [
      totalRestaurants, activeRestaurants, suspendedRestaurants, pendingRestaurants,
      prevTotal, prevActive, prevSuspended, prevPending,
      totalUsers, totalMenuItems, totalTables,
      currentSubscriptions, previousSubscriptions,
      currentOrders, previousOrders,
    ] = await Promise.all([
      this.restaurantRepo.countDocuments(),
      this.restaurantRepo.countDocuments({ status: 'ACTIVE' }),
      this.restaurantRepo.countDocuments({ status: 'SUSPENDED' }),
      this.restaurantRepo.countDocuments({ status: 'PENDING' }),
      this.restaurantRepo.countDocuments({ createdAt: { $lt: currentPeriodStart } }),
      this.restaurantRepo.countDocuments({ status: 'ACTIVE', createdAt: { $lt: currentPeriodStart } }),
      this.restaurantRepo.countDocuments({ status: 'SUSPENDED', createdAt: { $lt: currentPeriodStart } }),
      this.restaurantRepo.countDocuments({ status: 'PENDING', createdAt: { $lt: currentPeriodStart } }),
      this.userRepo.countDocuments(),
      this.menuItemRepo.countDocuments(),
      this.tableRepo.countDocuments(),
      this.subscriptionRepo.find({ status: 'ACTIVE', activatedAt: { $gte: currentPeriodStart } }),
      this.subscriptionRepo.find({ status: 'ACTIVE', activatedAt: { $gte: previousPeriodStart, $lt: previousPeriodEnd } }),
      this.orderRepo.find({ createdAt: { $gte: currentPeriodStart } }, { select: 'paymentStatus', lean: true }),
      this.orderRepo.find({ createdAt: { $gte: previousPeriodStart, $lt: previousPeriodEnd } }, { select: '_id', lean: true }),
    ]);

    const totalRevenue = currentSubscriptions.reduce((s, sub) => s + (sub.amountPaid || 0), 0);
    const previousRevenue = previousSubscriptions.reduce((s, sub) => s + (sub.amountPaid || 0), 0);

    const totalOrders = currentOrders.length;
    const paidOrders = currentOrders.filter((o) => o.paymentStatus === 'PAID').length;
    const pendingOrders = currentOrders.filter((o) => o.paymentStatus === 'PENDING').length;

    const dailyRevenue = await this.orderRepo.aggregate([
      { $match: { createdAt: { $gte: currentPeriodStart }, paymentStatus: 'PAID' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const revenueByRestaurant = await this.orderRepo.aggregate([
      { $match: { createdAt: { $gte: currentPeriodStart }, paymentStatus: 'PAID' } },
      { $group: { _id: '$restaurantId', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      { $project: { restaurantId: '$_id', restaurantName: '$restaurant.name', revenue: 1, orders: 1 } },
      { $sort: { revenue: -1 } },
    ]);

    const growthDataRaw = await this.restaurantRepo.aggregate([
      { $match: { createdAt: { $gte: currentPeriodStart } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, newRestaurants: { $sum: 1 }, churn: { $sum: { $cond: [{ $eq: ['$status', 'SUSPENDED'] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]);

    const growthData = {
      labels: growthDataRaw.map((d) => d._id),
      newRestaurants: growthDataRaw.map((d) => d.newRestaurants),
      churn: growthDataRaw.map((d) => d.churn),
    };

    const recentSuspensions = await this.restaurantRepo.find(
      { status: 'SUSPENDED' },
      { sort: { updatedAt: -1, createdAt: -1 }, limit: 5, select: 'name address updatedAt createdAt' }
    );

    const activityPeriodStart = new Date();
    activityPeriodStart.setDate(activityPeriodStart.getDate() - 7);
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const mostActiveRaw = await this.orderRepo.aggregate([
      { $match: { createdAt: { $gte: activityPeriodStart } } },
      { $group: { _id: { restaurantId: '$restaurantId', date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }, dailyOrders: { $sum: 1 }, dailyRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$total', 0] } } } },
      { $group: { _id: '$_id.restaurantId', totalOrders: { $sum: '$dailyOrders' }, totalRevenue: { $sum: '$dailyRevenue' }, dailyData: { $push: { date: '$_id.date', orders: '$dailyOrders' } } } },
      { $sort: { totalOrders: -1 } }, { $limit: 5 },
      { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      { $lookup: { from: 'users', localField: '_id', foreignField: 'restaurantId', pipeline: [{ $count: 'count' }], as: 'userCountData' } },
    ]);

    const mostActiveRestaurants = mostActiveRaw.map((r) => {
      const heatmap = last7Days.map((date) => { const d = r.dailyData.find((dd) => dd.date === date); return d ? d.orders : 0; });
      let daysAgo = 'N/A';
      for (let i = 6; i >= 0; i--) { if (heatmap[i] > 0) { const dd = 6 - i; daysAgo = dd === 0 ? 'Today' : `${dd} day(s) ago`; break; } }
      return { id: r._id, name: r.restaurant.name, totalOrders: r.totalOrders, totalRevenue: r.totalRevenue, users: r.userCountData.length > 0 ? r.userCountData[0].count : 0, daysAgo, heatmap };
    });

    return {
      overview: {
        totalRestaurants, activeRestaurants, suspendedRestaurants, pendingRestaurants,
        totalUsers, totalMenuItems, totalTables, totalOrders, paidOrders, pendingOrders, totalRevenue,
        days,
        totalRestaurantsGrowth: +calcGrowth(totalRestaurants, prevTotal).toFixed(1),
        activeRestaurantsGrowth: +calcGrowth(activeRestaurants, prevActive).toFixed(1),
        suspendedRestaurantsGrowth: +calcGrowth(suspendedRestaurants, prevSuspended).toFixed(1),
        pendingRestaurantsGrowth: +calcGrowth(pendingRestaurants, prevPending).toFixed(1),
        ordersGrowth: +calcGrowth(totalOrders, previousOrders.length).toFixed(1),
        revenueGrowth: +calcGrowth(totalRevenue, previousRevenue).toFixed(1),
      },
      dailyRevenue, revenueByRestaurant, growthData, recentSuspensions, mostActiveRestaurants,
    };
  }

  async getSystemActivity(query = {}) {
    const { page = 1, limit = 50, type, severity, restaurantId, dateFrom, dateTo } = query;
    const filter = {};
    if (type && type !== 'ALL') filter.type = type;
    if (severity && severity !== 'ALL') filter.severity = severity;
    if (restaurantId) filter.restaurantId = restaurantId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const ed = new Date(dateTo); ed.setHours(23, 59, 59, 999); filter.createdAt.$lte = ed; }
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [activities, total] = await Promise.all([
      this.activityLogRepo.find(filter, { sort: { createdAt: -1 }, skip, limit: parseInt(limit), lean: true }),
      this.activityLogRepo.countDocuments(filter),
    ]);
    const stats = await this.activityLogRepo.aggregate([
      {
        $facet: {
          byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }],
          bySeverity: [{ $group: { _id: '$severity', count: { $sum: 1 } } }],
          last24Hours: [{ $match: { createdAt: { $gte: new Date(Date.now() - 86400000) } } }, { $count: 'count' }],
          errors: [{ $match: { severity: { $in: ['ERROR', 'CRITICAL'] } } }, { $count: 'count' }],
        },
      },
    ]);
    const activityStats = {
      byType: stats[0].byType, bySeverity: stats[0].bySeverity,
      last24Hours: stats[0].last24Hours[0]?.count || 0, totalErrors: stats[0].errors[0]?.count || 0,
    };
    return {
      data: activities, stats: activityStats,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    };
  }

  async getAuditLogs(query = {}) {
    const { page = 1, limit = 50, type, restaurantId, cashierId, paymentMethod, dateFrom, dateTo } = query;
    const filter = {};
    if (type && type !== 'ALL') filter.type = type;
    if (restaurantId) filter.restaurantId = restaurantId;
    if (cashierId) filter.cashierId = cashierId;
    if (paymentMethod && paymentMethod !== 'ALL') filter.paymentMethod = paymentMethod;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const ed = new Date(dateTo); ed.setHours(23, 59, 59, 999); filter.createdAt.$lte = ed; }
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      this.txLogRepo.find(filter, {
        populate: [
          { path: 'restaurantId', select: 'name' },
          { path: 'cashierId', select: 'name email' },
          { path: 'orderId', select: 'orderNumber total' },
        ],
        sort: { createdAt: -1 }, skip, limit: parseInt(limit), lean: true,
      }),
      this.txLogRepo.countDocuments(filter),
    ]);
    const stats = await this.txLogRepo.aggregate([
      {
        $facet: {
          byType: [{ $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }, { $sort: { count: -1 } }],
          byPaymentMethod: [{ $match: { paymentMethod: { $ne: null } } }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }, { $sort: { totalAmount: -1 } }],
          todayTransactions: [{ $match: { createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }, { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }],
          totalSettled: [{ $match: { type: 'PAYMENT_SETTLED' } }, { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }],
        },
      },
    ]);
    const auditStats = {
      byType: stats[0].byType, byPaymentMethod: stats[0].byPaymentMethod,
      todayTransactions: stats[0].todayTransactions[0] || { count: 0, totalAmount: 0 },
      totalSettled: stats[0].totalSettled[0] || { count: 0, totalAmount: 0 },
    };
    return {
      data: transactions, stats: auditStats,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    };
  }

  async logActivity(logData) {
    try { return await this.activityLogRepo.log(logData); } catch { return null; }
  }
}

module.exports = SuperadminUseCases;
