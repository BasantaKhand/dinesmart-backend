const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const { getSystemAnalytics } = require('../controllers/superadmin.controller');

router.use(authenticate);
router.use(authorizeRoles('SUPERADMIN'));

/**
 * GET /api/superadmin/analytics
 * Get system-wide analytics
 */
router.get('/analytics', getSystemAnalytics);

module.exports = router;
