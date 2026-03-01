const di = require('../../../config/di');

exports.submitInquiry = async (req, res, next) => {
  try {
    const data = await di.inquiryUseCases.submitInquiry(req.body);
    res.status(201).json({ success: true, message: 'Inquiry submitted successfully. We will contact you soon.', data });
  } catch (error) { next(error); }
};

exports.getAllInquiries = async (req, res, next) => {
  try {
    const data = await di.inquiryUseCases.getAllInquiries(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getInquiry = async (req, res, next) => {
  try {
    const data = await di.inquiryUseCases.getInquiry(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.markContacted = async (req, res, next) => {
  try {
    const data = await di.inquiryUseCases.markContacted(req.params.id);
    res.status(200).json({ success: true, message: 'Inquiry marked as contacted', data });
  } catch (error) { next(error); }
};

exports.rejectInquiry = async (req, res, next) => {
  try {
    const data = await di.inquiryUseCases.rejectInquiry(req.params.id);
    res.status(200).json({ success: true, message: 'Inquiry rejected', data });
  } catch (error) { next(error); }
};

exports.onboardRestaurant = async (req, res, next) => {
  try {
    const result = await di.inquiryUseCases.onboardRestaurant(req.params.id, req.body.planId);
    const message = result.emailError
      ? 'Restaurant onboarded successfully. Email delivery may have failed.'
      : 'Restaurant onboarded successfully. Credentials sent via email. Restaurant will be activated after payment.';
    res.status(200).json({ success: true, message, data: result.inquiry, paymentToken: result.paymentToken, restaurantId: result.restaurantId, ...(result.emailError && { emailError: result.emailError }) });
  } catch (error) { next(error); }
};

exports.resendCredentialsEmail = async (req, res, next) => {
  try {
    await di.inquiryUseCases.resendCredentialsEmail(req.params.id);
    res.status(200).json({ success: true, message: 'Credentials email resent successfully' });
  } catch (error) { next(error); }
};
