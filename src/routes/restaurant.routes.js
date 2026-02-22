const express = require('express');
const Joi = require('joi');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { getMyPaymentSettings, updateMyPaymentSettings } = require('../controllers/restaurant.controller');

const paymentSettingsSchema = Joi.object({
    provider: Joi.string().valid('ESEWA', 'STRIPE', 'MANUAL').required(),
    qrCodeUrl: Joi.string().allow('', null),
    accountName: Joi.string().allow('', null),
    accountId: Joi.string().allow('', null),
    notes: Joi.string().allow('', null)
});

router.use(authenticate);

router.get('/me/payment-settings', authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'CASHIER', 'WAITER'), getMyPaymentSettings);
router.put('/me/payment-settings', authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN'), validate(paymentSettingsSchema), updateMyPaymentSettings);

module.exports = router;
