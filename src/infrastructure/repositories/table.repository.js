const Table = require('../db/models/Table');

class TableRepository {
  async find(filter, options = {}) {
    let query = Table.find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.select) query = query.select(options.select);
    if (options.lean) query = query.lean();
    return query;
  }

  async findOne(filter) {
    return Table.findOne(filter);
  }

  async create(data) {
    return Table.create(data);
  }

  async findByIdAndUpdate(id, data, options = {}) {
    return Table.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true, ...options });
  }

  async save(table) {
    return table.save();
  }

  async deleteOne(table) {
    return table.deleteOne();
  }

  async countDocuments(filter = {}) {
    return Table.countDocuments(filter);
  }
}

module.exports = TableRepository;
