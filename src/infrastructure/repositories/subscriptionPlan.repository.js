const SubscriptionPlan = require('../db/models/SubscriptionPlan');

class SubscriptionPlanRepository {
  async find(filter = {}, options = {}) {
    let query = SubscriptionPlan.find(filter);
    if (options.sort) query = query.sort(options.sort);
    return query;
  }

  async findById(id) {
    return SubscriptionPlan.findById(id);
  }

  async create(data) {
    return SubscriptionPlan.create(data);
  }

  async findByIdAndUpdate(id, data, options = {}) {
    return SubscriptionPlan.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true, ...options });
  }
}

module.exports = SubscriptionPlanRepository;
