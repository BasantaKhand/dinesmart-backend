const di = require('../../../config/di');

exports.getPlans = async (req, res, next) => {
  try {
    const data = await di.subscriptionUseCases.getPlans();
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getPlan = async (req, res, next) => {
  try {
    const data = await di.subscriptionUseCases.getPlan(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.createPlan = async (req, res, next) => {
  try {
    const data = await di.subscriptionUseCases.createPlan(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.updatePlan = async (req, res, next) => {
  try {
    const data = await di.subscriptionUseCases.updatePlan(req.params.id, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getMySubscription = async (req, res, next) => {
  try {
    const data = await di.subscriptionUseCases.getMySubscription(req.user.restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getAllSubscriptions = async (req, res, next) => {
  try {
    const data = await di.subscriptionUseCases.getAllSubscriptions(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.initializePayment = async (req, res, next) => {
  try {
    const data = await di.subscriptionUseCases.initializePayment(req.body);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const data = await di.subscriptionUseCases.verifyPayment(req.body.data);
    res.status(200).json({ success: true, message: 'Payment verified and subscription activated', data });
  } catch (error) { next(error); }
};

exports.checkPaymentStatus = async (req, res, next) => {
  try {
    const data = await di.subscriptionUseCases.checkPaymentStatus(req.params.subscriptionId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.manualActivation = async (req, res, next) => {
  try {
    const data = await di.subscriptionUseCases.manualActivation(req.params.subscriptionId, req.user._id, req.body.notes);
    res.status(200).json({ success: true, message: 'Subscription activated manually', data });
  } catch (error) { next(error); }
};
