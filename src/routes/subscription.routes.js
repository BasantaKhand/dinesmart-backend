const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

// ============= PUBLIC ROUTES =============

// Get all subscription plans (for landing page pricing)
router.get('/plans', subscriptionController.getPlans);

// Get single plan
router.get('/plans/:id', subscriptionController.getPlan);

// Initialize payment (public - for onboarding flow)
router.post('/payment/initialize', subscriptionController.initializePayment);

// Verify payment (callback from eSewa)
router.post('/payment/verify', subscriptionController.verifyPayment);

// Check payment status
router.get('/payment/status/:subscriptionId', subscriptionController.checkPaymentStatus);

// ============= AUTHENTICATED ROUTES =============

// Get my subscription (Restaurant Admin)
router.get(
    '/my-subscription',
    authenticate,
    authorizeRoles('RESTAURANT_ADMIN'),
    subscriptionController.getMySubscription
);

// ============= SUPERADMIN ROUTES =============

// Create subscription plan
router.post(
    '/plans',
    authenticate,
    authorizeRoles('SUPERADMIN'),
    subscriptionController.createPlan
);

// Update subscription plan
router.put(
    '/plans/:id',
    authenticate,
    authorizeRoles('SUPERADMIN'),
    subscriptionController.updatePlan
);

// Get all subscriptions
router.get(
    '/',
    authenticate,
    authorizeRoles('SUPERADMIN'),
    subscriptionController.getAllSubscriptions
);

// Manual activation
router.post(
    '/:subscriptionId/activate',
    authenticate,
    authorizeRoles('SUPERADMIN'),
    subscriptionController.manualActivation
);

module.exports = router;
