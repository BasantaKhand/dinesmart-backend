const ActivityLog = require('../db/models/ActivityLog');

class ActivityLogRepository {
  async log(data) {
    return ActivityLog.log(data);
  }

  async find(filter, options = {}) {
    let query = ActivityLog.find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.skip) query = query.skip(options.skip);
    if (options.limit) query = query.limit(options.limit);
    if (options.lean) query = query.lean();
    return query;
  }

  async countDocuments(filter = {}) {
    return ActivityLog.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return ActivityLog.aggregate(pipeline);
  }
}

module.exports = ActivityLogRepository;
