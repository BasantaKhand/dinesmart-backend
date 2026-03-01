const PaymentQueue = require('../db/models/PaymentQueue');

class PaymentQueueRepository {
  async findById(id) {
    return PaymentQueue.findById(id);
  }

  async find(filter, options = {}) {
    let query = PaymentQueue.find(filter);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    if (options.sort) query = query.sort(options.sort);
    if (options.limit) query = query.limit(options.limit);
    if (options.skip) query = query.skip(options.skip);
    return query;
  }

  async countDocuments(filter = {}) {
    return PaymentQueue.countDocuments(filter);
  }
}

module.exports = PaymentQueueRepository;
