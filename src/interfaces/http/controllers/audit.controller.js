const di = require('../../../config/di');

exports.logTransaction = async (req, res, next) => {
  try {
    const tx = await di.auditUseCases.logTransaction({ ...req.body, restaurantId: req.user.restaurantId, cashierId: req.user.id || req.user._id });
    res.status(201).json({ success: true, data: tx });
  } catch (error) { next(error); }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const result = await di.auditUseCases.getTransactions(req.user.restaurantId, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
};

exports.getDailySettlement = async (req, res, next) => {
  try {
    const result = await di.auditUseCases.getDailySettlement(req.user.restaurantId, req.query.date || new Date().toISOString());
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

exports.getMyTransactions = async (req, res, next) => {
  try {
    const result = await di.auditUseCases.getMyTransactions(req.user.restaurantId, req.user.id || req.user._id, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
};

exports.getSettlements = async (req, res, next) => {
  try {
    const result = await di.auditUseCases.getSettlements(req.user.restaurantId, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
};
