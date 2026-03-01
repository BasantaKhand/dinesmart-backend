const express = require('express');
const router = express.Router();
const Joi = require('joi');
const {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
} = require('../controllers/category.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');

const createCategorySchema = Joi.object({
    name: Joi.string().required().trim().min(2).max(100),
    description: Joi.string().allow('').max(500),
    image: Joi.string().allow('').uri(),
    status: Joi.string().valid('Active', 'Inactive'),
});

const updateCategorySchema = Joi.object({
    name: Joi.string().trim().min(2).max(100),
    description: Joi.string().allow('').max(500),
    image: Joi.string().allow('').uri(),
    status: Joi.string().valid('Active', 'Inactive'),
}).min(1);

// All routes require authentication
router.use(authenticate);

router.route('/')
    .get(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'CASHIER', 'WAITER'), getCategories)
    .post(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN'), validate(createCategorySchema), createCategory);

router.route('/:id')
    .get(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'CASHIER', 'WAITER'), getCategory)
    .put(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN'), validate(updateCategorySchema), updateCategory)
    .delete(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN'), deleteCategory);

module.exports = router;
