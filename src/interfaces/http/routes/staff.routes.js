const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const {
    getStaff,
    getStaffById,
    createStaff,
    updateStaff,
    deleteStaff,
    toggleStaffStatus,
    resetStaffPassword
} = require('../controllers/staff.controller');

// Validation schemas
const createStaffSchema = Joi.object({
    name: Joi.string().required().trim().min(2).max(100),
    email: Joi.string().email().required().trim(),
    phone: Joi.string().allow('', null).trim(),
    role: Joi.string().valid('WAITER', 'CASHIER').required(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE').optional()
});

const updateStaffSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    email: Joi.string().email().trim().optional(),
    phone: Joi.string().allow('', null).trim().optional(),
    role: Joi.string().valid('WAITER', 'CASHIER').optional(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE').optional()
});

// All routes require authentication and RESTAURANT_ADMIN role
router.use(authenticate);
router.use(authorizeRoles('RESTAURANT_ADMIN'));

// Routes
router.get('/', getStaff);
router.get('/:id', getStaffById);
router.post('/', validate(createStaffSchema), createStaff);
router.put('/:id', validate(updateStaffSchema), updateStaff);
router.delete('/:id', deleteStaff);
router.patch('/:id/status', toggleStaffStatus);
router.post('/:id/reset-password', resetStaffPassword);

module.exports = router;
