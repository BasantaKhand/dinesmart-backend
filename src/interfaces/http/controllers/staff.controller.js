const di = require('../../../config/di');

exports.getStaff = async (req, res, next) => {
  try {
    const result = await di.staffUseCases.getStaff(req.user.restaurantId, req.query);
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) { next(error); }
};

exports.getStaffById = async (req, res, next) => {
  try {
    const data = await di.staffUseCases.getStaffById(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.createStaff = async (req, res, next) => {
  try {
    const result = await di.staffUseCases.createStaff(req.body, req.user.restaurantId);
    res.status(201).json({ success: true, data: { staff: result.staff, credentials: result.credentials } });
  } catch (error) { next(error); }
};

exports.updateStaff = async (req, res, next) => {
  try {
    const data = await di.staffUseCases.updateStaff(req.params.id, req.body, req.user.restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.deleteStaff = async (req, res, next) => {
  try {
    await di.staffUseCases.deleteStaff(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, message: 'Staff member deleted' });
  } catch (error) { next(error); }
};

exports.toggleStaffStatus = async (req, res, next) => {
  try {
    const data = await di.staffUseCases.toggleStaffStatus(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.resetStaffPassword = async (req, res, next) => {
  try {
    const result = await di.staffUseCases.resetStaffPassword(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, data: { email: result.email, newPassword: result.newPassword }, message: 'Password reset successfully' });
  } catch (error) { next(error); }
};
