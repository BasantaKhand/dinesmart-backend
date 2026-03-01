const RestaurantInquiry = require('../db/models/RestaurantInquiry');

class RestaurantInquiryRepository {
  async create(data) {
    return RestaurantInquiry.create(data);
  }

  async findById(id, options = {}) {
    let query = RestaurantInquiry.findById(id);
    if (options.select) query = query.select(options.select);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    return query;
  }

  async find(filter, options = {}) {
    let query = RestaurantInquiry.find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    return query;
  }

  async findByIdAndUpdate(id, data, options = {}) {
    return RestaurantInquiry.findByIdAndUpdate(id, data, { returnDocument: 'after', ...options });
  }

  async save(doc) {
    return doc.save();
  }
}

module.exports = RestaurantInquiryRepository;
