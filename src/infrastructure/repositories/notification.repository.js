const Notification = require('../db/models/Notification');

class NotificationRepository {
  async find(filter, options = {}) {
    let query = Notification.find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.skip) query = query.skip(options.skip);
    if (options.limit) query = query.limit(options.limit);
    return query;
  }

  async findById(id) {
    return Notification.findById(id);
  }

  async findByIdAndUpdate(id, update, options = {}) {
    return Notification.findByIdAndUpdate(id, update, { returnDocument: 'after', ...options });
  }

  async findByIdAndDelete(id) {
    return Notification.findByIdAndDelete(id);
  }

  async updateMany(filter, update) {
    return Notification.updateMany(filter, update);
  }

  async countDocuments(filter = {}) {
    return Notification.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return Notification.aggregate(pipeline);
  }

  async save(notification) {
    return notification.save();
  }
}

module.exports = NotificationRepository;
