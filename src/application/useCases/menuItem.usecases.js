const { NotFoundError, ValidationError } = require('../../shared/errors');

class MenuItemUseCases {
  constructor({ menuItemRepository, categoryRepository }) {
    this.menuItemRepo = menuItemRepository;
    this.categoryRepo = categoryRepository;
  }

  async getMenuItems(restaurantId, filters = {}) {
    const query = { restaurantId };
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [{ name: searchRegex }, { code: searchRegex }];
    }
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.status) query.status = filters.status;

    return this.menuItemRepo.find(query, {
      populate: ['categoryId', 'name slug'],
      sort: { createdAt: -1 },
    });
  }

  async getMenuItem(id, restaurantId) {
    const menuItem = await this.menuItemRepo.findOne(
      { _id: id, restaurantId },
      { populate: ['categoryId', 'name slug'] }
    );
    if (!menuItem) throw new NotFoundError('Menu item not found');
    return menuItem;
  }

  async createMenuItem(data, restaurantId) {
    data.restaurantId = restaurantId;
    const category = await this.categoryRepo.findOne({ _id: data.categoryId, restaurantId });
    if (!category) throw new ValidationError('Invalid category');

    const menuItem = await this.menuItemRepo.create(data);
    await this.menuItemRepo.populate(menuItem, 'categoryId', 'name slug');
    return menuItem;
  }

  async updateMenuItem(id, data, restaurantId) {
    const menuItem = await this.menuItemRepo.findOne({ _id: id, restaurantId });
    if (!menuItem) throw new NotFoundError('Menu item not found');

    if (data.categoryId) {
      const category = await this.categoryRepo.findOne({ _id: data.categoryId, restaurantId });
      if (!category) throw new ValidationError('Invalid category');
    }

    const allowedFields = ['name', 'description', 'image', 'price', 'originalPrice', 'categoryId', 'status'];
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) menuItem[field] = data[field];
    });

    await this.menuItemRepo.save(menuItem);
    await this.menuItemRepo.populate(menuItem, 'categoryId', 'name slug');
    return menuItem;
  }

  async deleteMenuItem(id, restaurantId) {
    const menuItem = await this.menuItemRepo.findOne({ _id: id, restaurantId });
    if (!menuItem) throw new NotFoundError('Menu item not found');
    await this.menuItemRepo.deleteOne({ _id: menuItem._id });
  }
}

module.exports = MenuItemUseCases;
