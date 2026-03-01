const di = require('../../../config/di');

exports.getQueueStatus = async (req, res, next) => {
  try {
    const data = await di.paymentQueueUseCases.getQueueStatus(req.user.restaurantId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getFailedPayments = async (req, res, next) => {
  try {
    const result = await di.paymentQueueUseCases.getFailedPayments(req.user.restaurantId, req.query);
    res.json({ success: true, data: result.payments, pagination: { total: result.total, limit: parseInt(req.query.limit || 20), skip: parseInt(req.query.skip || 0) } });
  } catch (error) { next(error); }
};

exports.manualOverridePayment = async (req, res, next) => {
  try {
    const result = await di.paymentQueueUseCases.manualOverridePayment(req.params.paymentId, req.user, req.body.reason);
    res.json({ success: true, message: 'Payment manually approved', data: result });
  } catch (error) { next(error); }
};

exports.retryAllFailedPayments = async (req, res, next) => {
  try {
    const results = await di.paymentQueueUseCases.retryAllFailedPayments(req.user.restaurantId);
    res.json({ success: true, message: `Processed ${results.processed} payments`, data: results });
  } catch (error) { next(error); }
};

exports.getPaymentQueue = async (req, res, next) => {
  try {
    const result = await di.paymentQueueUseCases.getPaymentQueue(req.user.restaurantId, req.query);
    res.json({ success: true, data: result.payments, pagination: result.pagination });
  } catch (error) { next(error); }
};
