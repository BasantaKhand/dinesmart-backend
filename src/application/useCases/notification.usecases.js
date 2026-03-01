const { NotFoundError, ValidationError } = require('../../shared/errors');

class NotificationUseCases {
  constructor({ notificationRepository }) {
    this.notifRepo = notificationRepository;
  }

  async getNotifications(user, query = {}) {
    const { type, status, page = 1, limit = 20 } = query;
    const userRole = user?.role;
    const restaurantId = user?.restaurantId;

    const filter = { recipients: { $in: [userRole] } };
    const restaurantRoles = ['WAITER', 'CASHIER', 'KITCHEN', 'ADMIN', 'MANAGER', 'RESTAURANT_ADMIN'];
    if (restaurantRoles.includes(userRole) && restaurantId) {
      filter.$or = [{ restaurantId }, { restaurantId: { $exists: false } }];
    }
    if (type && type !== 'ALL') filter.type = type;
    if (status && status !== 'ALL') filter.status = status;

    const skip = (page - 1) * limit;
    const notifications = await this.notifRepo.find(filter, { sort: { createdAt: -1 }, skip, limit: parseInt(limit) });
    const total = await this.notifRepo.countDocuments(filter);

    const unreadFilter = { recipients: { $in: [userRole] }, status: 'UNREAD' };
    if (restaurantRoles.includes(userRole) && restaurantId) {
      unreadFilter.$or = [{ restaurantId }, { restaurantId: { $exists: false } }];
    }
    const unreadCounts = await this.notifRepo.aggregate([
      { $match: unreadFilter }, { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const unreadByType = {};
    unreadCounts.forEach((item) => { unreadByType[item._id] = item.count; });
    const totalUnread = await this.notifRepo.countDocuments(unreadFilter);

    return {
      notifications,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      unreadCounts: unreadByType, totalUnread,
    };
  }

  async markAsRead(id, userId) {
    const notification = await this.notifRepo.findByIdAndUpdate(id, {
      $set: { status: 'READ' },
      $addToSet: { readBy: { user: userId, readAt: new Date() } },
    });
    if (!notification) throw new NotFoundError('Notification not found');
    return notification;
  }

  async markAllAsRead(userRole, userId) {
    const result = await this.notifRepo.updateMany(
      { recipients: { $in: [userRole] }, status: 'UNREAD' },
      { $set: { status: 'READ' }, $addToSet: { readBy: { user: userId, readAt: new Date() } } }
    );
    return { modifiedCount: result.modifiedCount };
  }

  async archiveNotification(id) {
    const notification = await this.notifRepo.findByIdAndUpdate(id, { $set: { status: 'ARCHIVED' } });
    if (!notification) throw new NotFoundError('Notification not found');
    return notification;
  }

  async deleteNotification(id) {
    const notification = await this.notifRepo.findByIdAndDelete(id);
    if (!notification) throw new NotFoundError('Notification not found');
  }

  async getNotificationById(id, userId) {
    const notification = await this.notifRepo.findById(id);
    if (!notification) throw new NotFoundError('Notification not found');
    if (notification.status === 'UNREAD') {
      notification.status = 'READ';
      notification.readBy.push({ user: userId, readAt: new Date() });
      await this.notifRepo.save(notification);
    }
    return notification;
  }
}

module.exports = NotificationUseCases;
