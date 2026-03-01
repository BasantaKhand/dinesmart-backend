const di = require('../../../config/di');

exports.submitContactForm = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const data = await di.contactUseCases.submitContactForm(req.body, io);
    res.status(201).json({ success: true, message: 'Your message has been sent successfully! We will contact you soon.', data });
  } catch (error) { next(error); }
};

exports.getAllMessages = async (req, res, next) => {
  try {
    const result = await di.contactUseCases.getAllMessages(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    await di.contactUseCases.deleteMessage(req.params.id);
    res.status(200).json({ success: true, message: 'Message deleted successfully' });
  } catch (error) { next(error); }
};

exports.sendInvite = async (req, res, next) => {
  try {
    const data = await di.contactUseCases.sendInvite(req.params.id, req.body?.customMessage);
    res.status(200).json({ success: true, message: 'Invite sent successfully', data });
  } catch (error) { next(error); }
};

exports.validateInvite = async (req, res, next) => {
  try {
    const data = await di.contactUseCases.validateInvite(req.query.token);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.activateInvite = async (req, res, next) => {
  try {
    await di.contactUseCases.activateInvite(req.body);
    res.status(200).json({ success: true, message: 'Account activated successfully. You can now log in.' });
  } catch (error) { next(error); }
};
