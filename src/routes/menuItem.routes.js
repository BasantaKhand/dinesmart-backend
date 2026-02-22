const express = require('express');
const router = express.Router();
const Joi = require('joi');
const {
    getMenuItems,
    getMenuItem,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
} = require('../controllers/menuItem.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');

const createMenuItemSchema = Joi.object({
    name: Joi.string().required().trim().min(2).max(200),
    description: Joi.string().allow('').max(500),
    image: Joi.string().allow('').uri(),
    price: Joi.number().required().min(0),
    originalPrice: Joi.number().allow(null).min(0),
    categoryId: Joi.string().required(),
    status: Joi.string().valid('Active', 'Inactive'),
});

const updateMenuItemSchema = Joi.object({
    name: Joi.string().trim().min(2).max(200),
    description: Joi.string().allow('').max(500),
    image: Joi.string().allow('').uri(),
    price: Joi.number().min(0),
    originalPrice: Joi.number().allow(null).min(0),
    categoryId: Joi.string(),
    status: Joi.string().valid('Active', 'Inactive'),
}).min(1);

// All routes require authentication
router.use(authenticate);

router.route('/')
    .get(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'CASHIER', 'WAITER'), getMenuItems)
    .post(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN'), validate(createMenuItemSchema), createMenuItem);

router.route('/:id')
    .get(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'CASHIER', 'WAITER'), getMenuItem)
    .put(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN'), validate(updateMenuItemSchema), updateMenuItem)
    .delete(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN'), deleteMenuItem);

module.exports = router;
