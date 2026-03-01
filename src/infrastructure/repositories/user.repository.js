const User = require('../db/models/User');

class UserRepository {
  async findByEmail(email) {
    return User.find({ email: email.toLowerCase() }).select('+password');
  }

  async findById(id, selectPassword = false) {
    const query = User.findById(id);
    if (selectPassword) query.select('+password');
    return query;
  }

  async findOne(filter) {
    return User.findOne(filter);
  }

  async findOneWithPassword(filter) {
    return User.findOne(filter).select('+password');
  }

  async create(data) {
    return User.create(data);
  }

  async save(user) {
    return user.save();
  }

  async countDocuments(filter = {}) {
    return User.countDocuments(filter);
  }

  async find(filter, options = {}) {
    let query = User.find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.skip) query = query.skip(options.skip);
    if (options.limit) query = query.limit(options.limit);
    if (options.select) query = query.select(options.select);
    return query;
  }

  async findOneAndDelete(filter) {
    return User.findOneAndDelete(filter);
  }

  async deleteMany(filter) {
    return User.deleteMany(filter);
  }
}

module.exports = UserRepository;
