const express = require('express');
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const paymentQueueController = require('../controllers/paymentQueue.controller');

const router = express.Router();

// All payment queue routes require authentication
router.use(authenticate);

/**
 * GET /api/payment-queue/status
 * Get payment queue status
 */
router.get('/status', paymentQueueController.getQueueStatus);

/**
 * GET /api/payment-queue/failed
 * Get all failed payments
 */
router.get('/failed', paymentQueueController.getFailedPayments);

/**
 * POST /api/payment-queue/:paymentId/manual-override
 * Manually override a failed payment
 */
const manualOverrideSchema = Joi.object({
  reason: Joi.string().required().max(500),
});

router.post(
  '/:paymentId/manual-override',
  validate(manualOverrideSchema),
  paymentQueueController.manualOverridePayment
);

/**
 * POST /api/payment-queue/retry-all
 * Retry all failed payments
 */
router.post('/retry-all', paymentQueueController.retryAllFailedPayments);

/**
 * GET /api/payment-queue
 * Get payment queue
 */
router.get('/', paymentQueueController.getPaymentQueue);

module.exports = router;
