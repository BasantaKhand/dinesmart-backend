const mongoose = require('mongoose');
const Order = require('../db/models/Order');

class OrderRepository {
  async create(data) {
    return Order.create(data);
  }

  async findById(id, populateOptions = []) {
    let query = Order.findById(id);
    for (const pop of populateOptions) {
      query = query.populate(pop.path, pop.select);
    }
    return query;
  }

  async findOne(filter, populateOptions = []) {
    let query = Order.findOne(filter);
    for (const pop of populateOptions) {
      query = query.populate(pop.path, pop.select);
    }
    return query;
  }

  async find(filter, options = {}) {
    let query = Order.find(filter);
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    if (options.select) query = query.select(options.select);
    if (options.sort) query = query.sort(options.sort);
    if (options.limit) query = query.limit(options.limit);
    if (options.skip) query = query.skip(options.skip);
    if (options.lean) query = query.lean();
    return query;
  }

  async findOneAndUpdate(filter, data, options = {}) {
    let query = Order.findOneAndUpdate(filter, data, { returnDocument: 'after', runValidators: true, ...options });
    if (options.populate) {
      for (const pop of options.populate) {
        query = query.populate(pop.path, pop.select);
      }
    }
    return query;
  }

  async updateOne(filter, update, options = {}) {
    return Order.updateOne(filter, update, options);
  }

  async countDocuments(filter = {}) {
    return Order.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return Order.aggregate(pipeline);
  }

  async save(order) {
    return order.save();
  }

  async populate(doc, ...args) {
    return doc.populate(...args);
  }
}

module.exports = OrderRepository;
