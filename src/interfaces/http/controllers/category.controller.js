const di = require('../../../config/di');

exports.getCategories = async (req, res, next) => {
  try {
    const data = await di.categoryUseCases.getCategories(req.user.restaurantId);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
};

exports.getCategory = async (req, res, next) => {
  try {
    const data = await di.categoryUseCases.getCategory(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const data = await di.categoryUseCases.createCategory(req.body, req.user.restaurantId);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const data = await di.categoryUseCases.updateCategory(req.params.id, req.body, req.user.restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    await di.categoryUseCases.deleteCategory(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) { next(error); }
};
