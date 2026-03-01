const CheckoutSession = require('../db/models/CheckoutSession');

class CheckoutSessionRepository {
  async create(data) {
    return CheckoutSession.create(data);
  }

  async findById(id, options = {}) {
    let query = CheckoutSession.findById(id);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    return query;
  }

  async findOne(filter, options = {}) {
    let query = CheckoutSession.findOne(filter);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    return query;
  }

  async find(filter, options = {}) {
    let query = CheckoutSession.find(filter);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    if (options.sort) query = query.sort(options.sort);
    return query;
  }

  async findByIdAndDelete(id) {
    return CheckoutSession.findByIdAndDelete(id);
  }

  async save(session) {
    return session.save();
  }
}

module.exports = CheckoutSessionRepository;
