const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const { 
    getSystemAnalytics, 
    getSystemActivity, 
    getAuditLogs 
} = require('../controllers/superadmin.controller');

router.use(authenticate);
router.use(authorizeRoles('SUPERADMIN'));

/**
 * GET /api/superadmin/analytics
 * Get system-wide analytics
 */
router.get('/analytics', getSystemAnalytics);

/**
 * GET /api/superadmin/activity
 * Get system-wide activity logs
 */
router.get('/activity', getSystemActivity);

/**
 * GET /api/superadmin/audit-logs
 * Get system-wide audit/transaction logs
 */
router.get('/audit-logs', getAuditLogs);

module.exports = router;
