const di = require('../../../config/di');

exports.getTables = async (req, res, next) => {
  try {
    const data = await di.tableUseCases.getTables(req.user.restaurantId);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
};

exports.getTable = async (req, res, next) => {
  try {
    const data = await di.tableUseCases.getTable(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.createTable = async (req, res, next) => {
  try {
    const data = await di.tableUseCases.createTable(req.body, req.user.restaurantId);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.updateTable = async (req, res, next) => {
  try {
    const data = await di.tableUseCases.updateTable(req.params.id, req.body, req.user.restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.deleteTable = async (req, res, next) => {
  try {
    await di.tableUseCases.deleteTable(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, message: 'Table deleted successfully' });
  } catch (error) { next(error); }
};
