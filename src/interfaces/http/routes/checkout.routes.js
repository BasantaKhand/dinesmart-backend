const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkout.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

// ============= PUBLIC ROUTES =============

// Create checkout session (owner starts payment)
router.post('/session', checkoutController.createCheckoutSession);

// Verify payment (eSewa callback)
router.post('/verify', checkoutController.verifyPayment);

// Get session status
router.get('/session/:sessionId', checkoutController.getSessionStatus);

// Validate activation token
router.get('/activate/:token', checkoutController.validateActivationToken);

// Complete activation (owner sets password + restaurant details)
router.post('/activate/:token', checkoutController.completeActivation);

// ============= SUPERADMIN ROUTES =============

// Get all checkout sessions
router.get(
    '/sessions',
    authenticate,
    authorizeRoles('SUPERADMIN'),
    checkoutController.getAllSessions
);

// Get pending activations
router.get(
    '/pending-activations',
    authenticate,
    authorizeRoles('SUPERADMIN'),
    checkoutController.getPendingActivations
);

// Activate and send invite
router.post(
    '/sessions/:sessionId/activate',
    authenticate,
    authorizeRoles('SUPERADMIN'),
    checkoutController.activateAndSendInvite
);

// Resend invite
router.post(
    '/sessions/:sessionId/resend-invite',
    authenticate,
    authorizeRoles('SUPERADMIN'),
    checkoutController.resendInvite
);

module.exports = router;
