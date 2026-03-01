const di = require('../../../config/di');

exports.handleEsewaWebhook = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const order = await di.paymentUseCases.handleEsewaWebhook(req.body, io);
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};
