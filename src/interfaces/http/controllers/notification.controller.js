const di = require('../../../config/di');

exports.getNotifications = async (req, res, next) => {
  try {
    const result = await di.notificationUseCases.getNotifications(req.user, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const data = await di.notificationUseCases.markAsRead(req.params.id, req.user.id || req.user._id);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await di.notificationUseCases.markAllAsRead(req.user.role, req.user.id || req.user._id);
    res.status(200).json({ success: true, message: 'All notifications marked as read', ...result });
  } catch (error) { next(error); }
};

exports.archiveNotification = async (req, res, next) => {
  try {
    const data = await di.notificationUseCases.archiveNotification(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    await di.notificationUseCases.deleteNotification(req.params.id);
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) { next(error); }
};

exports.getNotificationById = async (req, res, next) => {
  try {
    const data = await di.notificationUseCases.getNotificationById(req.params.id, req.user.id || req.user._id);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};
