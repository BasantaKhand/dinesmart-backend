const mongoose = require('mongoose');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');

const getDateRange = (days) => {
    const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 90) : 30;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (safeDays - 1));
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate, days: safeDays };
};

// @desc    Get dashboard overview stats
// @route   GET /api/dashboard/overview?days=30
// @access  Private
const getDashboardOverview = async (req, res, next) => {
    try {
        const daysParam = parseInt(req.query.days, 10);
        const { startDate, endDate, days } = getDateRange(daysParam || 30);
        const restaurantId = req.user.restaurantId;

        const baseMatch = {
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: 'CANCELLED' },
        };

        const [totalOrders, paidStats, ordersForCustomers] = await Promise.all([
            Order.countDocuments(baseMatch),
            Order.aggregate([
                { $match: { ...baseMatch, paymentStatus: 'PAID' } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$total' },
                        paidOrders: { $sum: 1 },
                    },
                },
            ]),
            Order.find(baseMatch).select('orderType tableId').lean(),
        ]);

        const paidOrders = paidStats[0]?.paidOrders || 0;
        const totalRevenue = paidStats[0]?.totalRevenue || 0;

        const uniqueTables = new Set(
            ordersForCustomers
                .filter((order) => order.orderType === 'DINE_IN' && order.tableId)
                .map((order) => String(order.tableId))
        );
        const nonDineInCount = ordersForCustomers.filter((order) => order.orderType !== 'DINE_IN').length;
        const customersCount = uniqueTables.size + nonDineInCount;

        const productsCount = await MenuItem.countDocuments({ restaurantId });
        const tablesTotal = await Table.countDocuments({ restaurantId });
        const occupiedTables = await Table.countDocuments({ restaurantId, status: 'OCCUPIED' });

        res.status(200).json({
            success: true,
            data: {
                days,
                totalRevenue,
                totalOrders,
                paidOrders,
                productsCount,
                customersCount,
                tablesTotal,
                occupiedTables,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get sales overview chart data
// @route   GET /api/dashboard/sales-overview?days=30
// @access  Private
const getSalesOverview = async (req, res, next) => {
    try {
        const daysParam = parseInt(req.query.days, 10);
        const { startDate, endDate, days } = getDateRange(daysParam || 30);
        const restaurantId = req.user.restaurantId;

        const results = await Order.aggregate([
            {
                $match: {
                    restaurantId: new mongoose.Types.ObjectId(restaurantId),
                    createdAt: { $gte: startDate, $lte: endDate },
                    paymentStatus: 'PAID',
                    status: { $ne: 'CANCELLED' },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    total: { $sum: '$total' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.status(200).json({
            success: true,
            data: results.map((item) => ({ date: item._id, total: item.total })),
            meta: { days },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get category sales chart data
// @route   GET /api/dashboard/category-sales?days=30
// @access  Private
const getCategorySales = async (req, res, next) => {
    try {
        const daysParam = parseInt(req.query.days, 10);
        const { startDate, endDate, days } = getDateRange(daysParam || 30);
        const restaurantId = req.user.restaurantId;

        const results = await Order.aggregate([
            {
                $match: {
                    restaurantId: new mongoose.Types.ObjectId(restaurantId),
                    createdAt: { $gte: startDate, $lte: endDate },
                    paymentStatus: 'PAID',
                    status: { $ne: 'CANCELLED' },
                },
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: 'items.menuItemId',
                    foreignField: '_id',
                    as: 'menuItem',
                },
            },
            { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'menuItem.categoryId',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ['$category.name', 'Uncategorized'] },
                    value: { $sum: '$items.total' },
                },
            },
            { $sort: { value: -1 } },
        ]);

        res.status(200).json({
            success: true,
            data: results.map((item) => ({ name: item._id, value: item.value })),
            meta: { days },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardOverview,
    getSalesOverview,
    getCategorySales,
};
