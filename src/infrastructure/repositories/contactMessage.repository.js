const ContactMessage = require('../db/models/ContactMessage');

class ContactMessageRepository {
  async create(data) {
    return ContactMessage.create(data);
  }

  async findById(id) {
    return ContactMessage.findById(id);
  }

  async findOne(filter, options = {}) {
    let query = ContactMessage.findOne(filter);
    if (options.select) query = query.select(options.select);
    return query;
  }

  async find(filter, options = {}) {
    let query = ContactMessage.find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.limit) query = query.limit(options.limit);
    if (options.skip) query = query.skip(options.skip);
    return query;
  }

  async save(doc) {
    return doc.save();
  }

  async deleteOne(doc) {
    return doc.deleteOne();
  }

  async countDocuments(filter = {}) {
    return ContactMessage.countDocuments(filter);
  }
}

module.exports = ContactMessageRepository;
