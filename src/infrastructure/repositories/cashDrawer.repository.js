const CashDrawer = require('../db/models/CashDrawer');

class CashDrawerRepository {
  async findOne(filter, options = {}) {
    let query = CashDrawer.findOne(filter);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    return query;
  }

  async create(data) {
    const drawer = new CashDrawer(data);
    return drawer.save();
  }

  async save(drawer) {
    return drawer.save();
  }

  async find(filter, options = {}) {
    let query = CashDrawer.find(filter);
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
    return CashDrawer.countDocuments(filter);
  }
}

module.exports = CashDrawerRepository;
