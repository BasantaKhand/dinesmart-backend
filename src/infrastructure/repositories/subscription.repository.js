const Subscription = require('../db/models/Subscription');

class SubscriptionRepository {
  async create(data) {
    return Subscription.create(data);
  }

  async findOne(filter, options = {}) {
    let query = Subscription.findOne(filter);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    return query;
  }

  async findById(id, options = {}) {
    let query = Subscription.findById(id);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    return query;
  }

  async find(filter, options = {}) {
    let query = Subscription.find(filter);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    if (options.sort) query = query.sort(options.sort);
    return query;
  }

  async findByIdAndUpdate(id, data, options = {}) {
    let query = Subscription.findByIdAndUpdate(id, data, { returnDocument: 'after', ...options });
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    return query;
  }
}

module.exports = SubscriptionRepository;
