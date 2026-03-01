const di = require('../../../config/di');

exports.getSystemAnalytics = async (req, res, next) => {
  try {
    const data = await di.superadminUseCases.getSystemAnalytics(req.query.days);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getSystemActivity = async (req, res, next) => {
  try {
    const result = await di.superadminUseCases.getSystemActivity(req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const result = await di.superadminUseCases.getAuditLogs(req.query);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

exports.logActivity = async (logData) => {
  try { return await di.superadminUseCases.logActivity(logData); } catch { return null; }
};
