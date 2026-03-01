const express = require('express');
const router = express.Router();
const Joi = require('joi');
const {
    getTables,
    getTable,
    createTable,
    updateTable,
    deleteTable,
} = require('../controllers/table.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');

const createTableSchema = Joi.object({
    number: Joi.string().trim(),
    capacity: Joi.number().required().min(1),
    status: Joi.string().valid('AVAILABLE', 'OCCUPIED', 'RESERVED'),
});

const updateTableSchema = Joi.object({
    number: Joi.string().trim(),
    capacity: Joi.number().min(1),
    status: Joi.string().valid('AVAILABLE', 'OCCUPIED', 'RESERVED'),
}).min(1);

// All routes require authentication + RESTAURANT_ADMIN or SUPERADMIN (for now)
router.use(authenticate);
router.use(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'CASHIER', 'WAITER'));

router.route('/')
    .get(getTables)
    .post(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN'), validate(createTableSchema), createTable);

router.route('/:id')
    .get(getTable)
    .put(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER', 'CASHIER'), validate(updateTableSchema), updateTable)
    .delete(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN'), deleteTable);

module.exports = router;
