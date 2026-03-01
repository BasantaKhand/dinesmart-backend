const Restaurant = require('../db/models/Restaurant');

class RestaurantRepository {
  async findById(id, selectFields = null) {
    let query = Restaurant.findById(id);
    if (selectFields) query = query.select(selectFields);
    return query;
  }

  async find(options = {}) {
    let query = Restaurant.find(options.filter || {});
    if (options.sort) query = query.sort(options.sort);
    if (options.skip) query = query.skip(options.skip);
    if (options.limit) query = query.limit(options.limit);
    if (options.select) query = query.select(options.select);
    return query;
  }

  async create(data) {
    return Restaurant.create(data);
  }

  async findByIdAndUpdate(id, data, options = {}) {
    return Restaurant.findByIdAndUpdate(id, data, { returnDocument: 'after', ...options });
  }

  async findByIdAndDelete(id) {
    return Restaurant.findByIdAndDelete(id);
  }

  async countDocuments(filter = {}) {
    return Restaurant.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return Restaurant.aggregate(pipeline);
  }
}

module.exports = RestaurantRepository;
