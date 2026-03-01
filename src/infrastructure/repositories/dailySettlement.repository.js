const DailySettlement = require('../db/models/DailySettlement');

class DailySettlementRepository {
  async findOneAndUpdate(filter, data, options = {}) {
    return DailySettlement.findOneAndUpdate(filter, data, { upsert: true, returnDocument: 'after', ...options });
  }

  async find(filter, options = {}) {
    let query = DailySettlement.find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.limit) query = query.limit(options.limit);
    if (options.skip) query = query.skip(options.skip);
    return query;
  }

  async countDocuments(filter = {}) {
    return DailySettlement.countDocuments(filter);
  }
}

module.exports = DailySettlementRepository;
