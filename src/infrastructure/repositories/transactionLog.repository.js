const TransactionLog = require('../db/models/TransactionLog');

class TransactionLogRepository {
  async create(data) {
    const log = new TransactionLog(data);
    return log.save();
  }

  async find(filter, options = {}) {
    let query = TransactionLog.find(filter);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    if (options.sort) query = query.sort(options.sort);
    if (options.limit) query = query.limit(options.limit);
    if (options.skip) query = query.skip(options.skip);
    if (options.lean) query = query.lean();
    return query;
  }

  async countDocuments(filter = {}) {
    return TransactionLog.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return TransactionLog.aggregate(pipeline);
  }
}

module.exports = TransactionLogRepository;
