const { NotFoundError, ValidationError } = require('../../shared/errors');

class CategoryUseCases {
  constructor({ categoryRepository, menuItemRepository }) {
    this.categoryRepo = categoryRepository;
    this.menuItemRepo = menuItemRepository;
  }

  async getCategories(restaurantId) {
    const categories = await this.categoryRepo.findByRestaurant(restaurantId);
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const productsCount = await this.menuItemRepo.countDocuments({ categoryId: cat._id, restaurantId });
        return { ...cat.toObject(), productsCount, subcategoriesCount: 0 };
      })
    );
    return categoriesWithCounts;
  }

  async getCategory(id, restaurantId) {
    const category = await this.categoryRepo.findOne({ _id: id, restaurantId });
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  async createCategory(data, restaurantId) {
    try {
      data.restaurantId = restaurantId;
      return await this.categoryRepo.create(data);
    } catch (error) {
      if (error.code === 11000) throw new ValidationError('A category with this name already exists');
      throw error;
    }
  }

  async updateCategory(id, data, restaurantId) {
    const category = await this.categoryRepo.findOne({ _id: id, restaurantId });
    if (!category) throw new NotFoundError('Category not found');

    const allowedFields = ['name', 'description', 'image', 'status'];
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) category[field] = data[field];
    });

    try {
      await this.categoryRepo.save(category);
      return category;
    } catch (error) {
      if (error.code === 11000) throw new ValidationError('A category with this name already exists');
      throw error;
    }
  }

  async deleteCategory(id, restaurantId) {
    const category = await this.categoryRepo.findOne({ _id: id, restaurantId });
    if (!category) throw new NotFoundError('Category not found');

    const itemCount = await this.menuItemRepo.countDocuments({ categoryId: category._id });
    if (itemCount > 0) {
      throw new ValidationError(
        `Cannot delete category. ${itemCount} menu item(s) are still linked to it. Remove or reassign them first.`
      );
    }

    await this.categoryRepo.deleteOne({ _id: category._id });
  }
}

module.exports = CategoryUseCases;
