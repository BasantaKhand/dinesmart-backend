const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { 
    submitInquiry, 
    getAllInquiries, 
    getInquiry, 
    markContacted,
    rejectInquiry,
    onboardRestaurant,
    resendCredentialsEmail
} = require('../controllers/inquiry.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');

// Public endpoint - submit inquiry (no auth required)
const submitInquirySchema = Joi.object({
    ownerName: Joi.string().required(),
    ownerEmail: Joi.string().email().required(),
    ownerPhone: Joi.string().required(),
    restaurantName: Joi.string().required(),
    restaurantAddress: Joi.string().required(),
    restaurantPhone: Joi.string(),
    cuisineType: Joi.string(),
    numberOfTables: Joi.number().min(1),
    message: Joi.string()
});

router.post('/submit', validate(submitInquirySchema), submitInquiry);

// Superadmin only endpoints
router.get('/', authenticate, authorize('SUPERADMIN'), getAllInquiries);
router.get('/:id', authenticate, authorize('SUPERADMIN'), getInquiry);
router.put('/:id/mark-contacted', authenticate, authorize('SUPERADMIN'), markContacted);
router.put('/:id/reject', authenticate, authorize('SUPERADMIN'), rejectInquiry);
router.post('/:id/onboard', authenticate, authorize('SUPERADMIN'), onboardRestaurant);
router.post('/:id/resend-credentials', authenticate, authorize('SUPERADMIN'), resendCredentialsEmail);

module.exports = router;
