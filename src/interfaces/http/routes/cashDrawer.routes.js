const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const cashDrawerController = require('../controllers/cashDrawer.controller');

const router = express.Router();

// All drawer routes require authentication
router.use(authenticate);

/**
 * POST /api/cash-drawer/open
 * Open cash drawer
 */
const openDrawerSchema = Joi.object({
  openingAmount: Joi.number().default(0),
  notes: Joi.string().optional(),
});

router.post('/open', validate(openDrawerSchema), cashDrawerController.openDrawer);

/**
 * POST /api/cash-drawer/close
 * Close cash drawer
 */
const closeDrawerSchema = Joi.object({
  closingAmount: Joi.number().required(),
  notes: Joi.string().optional(),
});

router.post('/close', validate(closeDrawerSchema), cashDrawerController.closeDrawer);

/**
 * GET /api/cash-drawer/status
 * Get current drawer status
 */
router.get('/status', cashDrawerController.getDrawerStatus);

/**
 * GET /api/cash-drawer/history
 * Get drawer history
 */
router.get('/history', cashDrawerController.getDrawerHistory);

module.exports = router;
