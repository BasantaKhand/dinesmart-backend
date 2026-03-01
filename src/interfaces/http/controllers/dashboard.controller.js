const di = require('../../../config/di');

exports.getDashboardOverview = async (req, res, next) => {
  try {
    const data = await di.dashboardUseCases.getDashboardOverview(req.user.restaurantId, req.query.days);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getSalesOverview = async (req, res, next) => {
  try {
    const result = await di.dashboardUseCases.getSalesOverview(req.user.restaurantId, req.query.days);
    res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
};

exports.getCategorySales = async (req, res, next) => {
  try {
    const result = await di.dashboardUseCases.getCategorySales(req.user.restaurantId, req.query.days);
    res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
};
