const Notification = require('../models/Notification');
const { ErrorResponse } = require('../middlewares/error.middleware');

// @desc    Get all notifications for authenticated user
// @route   GET /api/notifications
// @access  Protected
exports.getNotifications = async (req, res, next) => {
    try {
        const { type, status, page = 1, limit = 20 } = req.query;
        const userRole = req.user?.role;
        const restaurantId = req.user?.restaurantId;

        // Build filter query
        const filter = {
            recipients: { $in: [userRole] },
        };

        // For restaurant-specific roles, also filter by restaurantId
        const restaurantRoles = ['WAITER', 'CASHIER', 'KITCHEN', 'ADMIN', 'MANAGER', 'RESTAURANT_ADMIN'];
        if (restaurantRoles.includes(userRole) && restaurantId) {
            filter.$or = [
                { restaurantId: restaurantId },
                { restaurantId: { $exists: false } }, // Also include global notifications
            ];
        }

        if (type && type !== 'ALL') {
            filter.type = type;
        }

        if (status && status !== 'ALL') {
            filter.status = status;
        }

        const skip = (page - 1) * limit;

        // Fetch notifications with pagination
        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await Notification.countDocuments(filter);

        // Build unread filter with same restaurantId logic
        const unreadFilter = {
            recipients: { $in: [userRole] },
            status: 'UNREAD',
        };
        if (restaurantRoles.includes(userRole) && restaurantId) {
            unreadFilter.$or = [
                { restaurantId: restaurantId },
                { restaurantId: { $exists: false } },
            ];
        }

        // Count unread by type
        const unreadCounts = await Notification.aggregate([
            { $match: unreadFilter },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                },
            },
        ]);

        const unreadByType = {};
        unreadCounts.forEach(item => {
            unreadByType[item._id] = item.count;
        });

        const totalUnread = await Notification.countDocuments(unreadFilter);

        res.status(200).json({
            success: true,
            data: {
                notifications,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit),
                },
                unreadCounts: unreadByType,
                totalUnread,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Protected
exports.markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;

        const notification = await Notification.findByIdAndUpdate(
            id,
            {
                $set: { status: 'READ' },
                $addToSet: {
                    readBy: {
                        user: userId,
                        readAt: new Date(),
                    },
                },
            },
            { returnDocument: 'after' }
        );

        if (!notification) {
            return next(new ErrorResponse('Notification not found', 404));
        }

        res.status(200).json({
            success: true,
            data: notification,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark multiple notifications as read
// @route   PUT /api/notifications/read-all
// @access  Protected
exports.markAllAsRead = async (req, res, next) => {
    try {
        const userRole = req.user?.role;
        const userId = req.user?._id;

        const result = await Notification.updateMany(
            {
                recipients: { $in: [userRole] },
                status: 'UNREAD',
            },
            {
                $set: { status: 'READ' },
                $addToSet: {
                    readBy: {
                        user: userId,
                        readAt: new Date(),
                    },
                },
            }
        );

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
            data: {
                modifiedCount: result.modifiedCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Archive notification
// @route   PUT /api/notifications/:id/archive
// @access  Protected
exports.archiveNotification = async (req, res, next) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByIdAndUpdate(
            id,
            { $set: { status: 'ARCHIVED' } },
            { returnDocument: 'after' }
        );

        if (!notification) {
            return next(new ErrorResponse('Notification not found', 404));
        }

        res.status(200).json({
            success: true,
            data: notification,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Protected
exports.deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByIdAndDelete(id);

        if (!notification) {
            return next(new ErrorResponse('Notification not found', 404));
        }

        res.status(200).json({
            success: true,
            message: 'Notification deleted',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Protected
exports.getNotificationById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findById(id);

        if (!notification) {
            return next(new ErrorResponse('Notification not found', 404));
        }

        // Mark as read if viewing
        if (notification.status === 'UNREAD') {
            notification.status = 'READ';
            notification.readBy.push({
                user: req.user?._id,
                readAt: new Date(),
            });
            await notification.save();
        }

        res.status(200).json({
            success: true,
            data: notification,
        });
    } catch (error) {
        next(error);
    }
};
