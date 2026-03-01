const di = require('../../../config/di');

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const data = await di.checkoutUseCases.createCheckoutSession(req.body);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const data = await di.checkoutUseCases.verifyPayment(req.body.data, io);
    res.status(200).json({ success: true, message: 'Payment verified successfully. Awaiting activation by admin.', data });
  } catch (error) { next(error); }
};

exports.getSessionStatus = async (req, res, next) => {
  try {
    const data = await di.checkoutUseCases.getSessionStatus(req.params.sessionId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getAllSessions = async (req, res, next) => {
  try {
    const data = await di.checkoutUseCases.getAllSessions(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getPendingActivations = async (req, res, next) => {
  try {
    const data = await di.checkoutUseCases.getPendingActivations();
    res.status(200).json({ success: true, data, count: data.length });
  } catch (error) { next(error); }
};

exports.activateAndSendInvite = async (req, res, next) => {
  try {
    const data = await di.checkoutUseCases.activateAndSendInvite(req.params.sessionId);
    const message = data.emailError
      ? 'Session activated but email delivery failed. You can copy the activation link or resend later.'
      : 'Activation invite sent successfully';
    res.status(200).json({ success: true, message, data });
  } catch (error) { next(error); }
};

exports.resendInvite = async (req, res, next) => {
  try {
    const data = await di.checkoutUseCases.resendInvite(req.params.sessionId);
    const message = data.emailError
      ? 'Invite regenerated but email delivery failed. You can copy the activation link.'
      : 'Activation invite resent successfully';
    res.status(200).json({ success: true, message, data });
  } catch (error) { next(error); }
};

exports.validateActivationToken = async (req, res, next) => {
  try {
    const data = await di.checkoutUseCases.validateActivationToken(req.params.token);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.completeActivation = async (req, res, next) => {
  try {
    const data = await di.checkoutUseCases.completeActivation(req.params.token, req.body);
    res.status(200).json({ success: true, message: 'Account activated successfully! You can now login.', data });
  } catch (error) { next(error); }
};
