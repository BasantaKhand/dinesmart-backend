const Category = require('../db/models/Category');

class CategoryRepository {
  async findByRestaurant(restaurantId) {
    return Category.find({ restaurantId }).sort({ createdAt: -1 });
  }

  async findOne(filter) {
    return Category.findOne(filter);
  }

  async create(data) {
    return Category.create(data);
  }

  async save(category) {
    return category.save();
  }

  async deleteOne(filter) {
    return Category.deleteOne(filter);
  }
}

module.exports = CategoryRepository;
