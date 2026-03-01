const di = require('../../../config/di');

exports.getAllRestaurants = async (req, res, next) => {
  try {
    const result = await di.restaurantUseCases.getAllRestaurants(req.query);
    res.status(200).json({ success: true, count: result.data.length, data: result.data, pagination: result.pagination });
  } catch (error) { next(error); }
};

exports.createRestaurant = async (req, res, next) => {
  try {
    const data = await di.restaurantUseCases.createRestaurant(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.updateRestaurantStatus = async (req, res, next) => {
  try {
    const data = await di.restaurantUseCases.updateRestaurantStatus(req.params.id, req.body.status, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.deleteRestaurant = async (req, res, next) => {
  try {
    await di.restaurantUseCases.deleteRestaurant(req.params.id, req.user);
    res.status(200).json({ success: true, message: 'Restaurant deleted successfully' });
  } catch (error) { next(error); }
};

exports.resetRestaurantPassword = async (req, res, next) => {
  try {
    const result = await di.restaurantUseCases.resetRestaurantPassword(req.params.id);
    res.status(200).json({ success: true, data: result, message: 'Password reset successfully' });
  } catch (error) { next(error); }
};

exports.getMyPaymentSettings = async (req, res, next) => {
  try {
    const data = await di.restaurantUseCases.getMyPaymentSettings(req.user.restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.updateMyPaymentSettings = async (req, res, next) => {
  try {
    const data = await di.restaurantUseCases.updateMyPaymentSettings(req.user.restaurantId, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};
