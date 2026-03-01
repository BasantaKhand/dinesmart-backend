const MenuItem = require('../db/models/MenuItem');

class MenuItemRepository {
  async find(query, options = {}) {
    let q = MenuItem.find(query);
    if (options.populate) q = q.populate(...(Array.isArray(options.populate) ? options.populate : [options.populate]));
    if (options.sort) q = q.sort(options.sort);
    return q;
  }

  async findOne(filter, options = {}) {
    let q = MenuItem.findOne(filter);
    if (options.populate) q = q.populate(...(Array.isArray(options.populate) ? options.populate : [options.populate]));
    return q;
  }

  async create(data) {
    const item = await MenuItem.create(data);
    return item;
  }

  async save(menuItem) {
    return menuItem.save();
  }

  async populate(doc, ...args) {
    return doc.populate(...args);
  }

  async deleteOne(filter) {
    return MenuItem.deleteOne(filter);
  }

  async countDocuments(filter = {}) {
    return MenuItem.countDocuments(filter);
  }
}

module.exports = MenuItemRepository;
