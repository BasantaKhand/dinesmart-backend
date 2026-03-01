const express = require('express');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const auditController = require('../controllers/audit.controller');

const router = express.Router();

// All audit routes require authentication
router.use(authenticate);

/**
 * GET /api/audit/transactions
 * Get all transactions (admin/cashier can view)
 */
router.get('/transactions', auditController.getTransactions);

/**
 * GET /api/audit/my-transactions
 * Get current user's transactions
 */
router.get('/my-transactions', auditController.getMyTransactions);

/**
 * GET /api/audit/daily-settlement
 * Get daily settlement for a specific date
 */
router.get('/daily-settlement', auditController.getDailySettlement);

/**
 * GET /api/audit/settlements
 * Get all daily settlements
 */
router.get('/settlements', auditController.getSettlements);

module.exports = router;
