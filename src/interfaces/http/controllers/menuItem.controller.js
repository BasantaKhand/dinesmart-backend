const di = require('../../../config/di');

exports.getMenuItems = async (req, res, next) => {
  try {
    const result = await di.menuItemUseCases.getMenuItems(req.user.restaurantId, req.query);
    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) { next(error); }
};

exports.getMenuItem = async (req, res, next) => {
  try {
    const data = await di.menuItemUseCases.getMenuItem(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.createMenuItem = async (req, res, next) => {
  try {
    const data = await di.menuItemUseCases.createMenuItem(req.body, req.user.restaurantId);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    const data = await di.menuItemUseCases.updateMenuItem(req.params.id, req.body, req.user.restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.deleteMenuItem = async (req, res, next) => {
  try {
    await di.menuItemUseCases.deleteMenuItem(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) { next(error); }
};
