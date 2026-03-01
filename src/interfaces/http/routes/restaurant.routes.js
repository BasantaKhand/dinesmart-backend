const express = require('express');
const Joi = require('joi');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const {
    getAllRestaurants,
    createRestaurant,
    updateRestaurantStatus,
    deleteRestaurant,
    getMyPaymentSettings,
    updateMyPaymentSettings,
    resetRestaurantPassword
} = require('../controllers/restaurant.controller');

const paymentSettingsSchema = Joi.object({
    provider: Joi.string().valid('ESEWA', 'STRIPE', 'MANUAL').required(),
    qrCodeUrl: Joi.string().allow('', null),
    accountName: Joi.string().allow('', null),
    accountId: Joi.string().allow('', null),
    notes: Joi.string().allow('', null)
});

const createRestaurantSchema = Joi.object({
    name: Joi.string().required().trim(),
    address: Joi.string().allow('', null).trim(),
    status: Joi.string().valid('PENDING', 'ACTIVE', 'SUSPENDED').optional(),
    ownerName: Joi.string().required().trim(),
    email: Joi.string().email().required().trim(),
    password: Joi.string().min(6).optional()
});

const updateStatusSchema = Joi.object({
    status: Joi.string().valid('PENDING', 'ACTIVE', 'SUSPENDED').required()
});

router.use(authenticate);

// SUPERADMIN routes
router.get('/', authorizeRoles('SUPERADMIN'), getAllRestaurants);
router.post('/', authorizeRoles('SUPERADMIN'), validate(createRestaurantSchema), createRestaurant);
router.patch('/:id/status', authorizeRoles('SUPERADMIN'), validate(updateStatusSchema), updateRestaurantStatus);
router.delete('/:id', authorizeRoles('SUPERADMIN'), deleteRestaurant);

router.post(
    '/:id/reset-password',
    authorizeRoles('SUPERADMIN'),
    resetRestaurantPassword
);

// Restaurant-specific routes
router.get('/me/payment-settings', authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'CASHIER', 'WAITER'), getMyPaymentSettings);
router.put('/me/payment-settings', authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN'), validate(paymentSettingsSchema), updateMyPaymentSettings);

module.exports = router;
