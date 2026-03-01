const di = require('../../../config/di');

exports.openDrawer = async (req, res, next) => {
  try {
    const drawer = await di.cashDrawerUseCases.openDrawer(req.body, req.user);
    res.status(201).json({ success: true, data: drawer });
  } catch (error) { next(error); }
};

exports.closeDrawer = async (req, res, next) => {
  try {
    const drawer = await di.cashDrawerUseCases.closeDrawer(req.body, req.user);
    res.status(200).json({ success: true, data: drawer });
  } catch (error) { next(error); }
};

exports.getDrawerStatus = async (req, res, next) => {
  try {
    const drawer = await di.cashDrawerUseCases.getDrawerStatus(req.user.restaurantId);
    res.status(200).json({ success: true, data: drawer });
  } catch (error) { next(error); }
};

exports.getDrawerHistory = async (req, res, next) => {
  try {
    const result = await di.cashDrawerUseCases.getDrawerHistory(req.user.restaurantId, req.query);
    res.status(200).json({ success: true, data: result.drawers, pagination: result.pagination });
  } catch (error) { next(error); }
};
