const express = require('express');
const router = express.Router();
const Joi = require('joi');
const {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus,
    updateOrderItemStatus,
    getActiveOrderByTable,
    addItemsToOrder,
    applyDiscount,
    splitOrder,
    mergeOrders,
    markBillPrinted
} = require('../controllers/order.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');

const createOrderSchema = Joi.object({
    tableId: Joi.string().required().messages({
        'string.empty': 'Table ID is required',
        'any.required': 'Table ID is required'
    }),
    items: Joi.array().items(Joi.object({
        menuItemId: Joi.string().required(),
        name: Joi.string().required(),
        price: Joi.number().required(),
        quantity: Joi.number().required().min(1),
        total: Joi.number().required(),
        notes: Joi.string().allow('', null)
    })).required().min(1),
    orderType: Joi.string().valid('DINE_IN', 'TAKEAWAY', 'DELIVERY').default('DINE_IN'),
    subtotal: Joi.number().required(),
    tax: Joi.number().required(),
    serviceCharge: Joi.number().default(0),
    total: Joi.number().required(),
    notes: Joi.string().allow('', null)
});

const updateStatusSchema = Joi.object({
    status: Joi.string().valid('PENDING', 'COOKING', 'COOKED', 'SERVED', 'COMPLETED', 'CANCELLED').required(),
    paymentStatus: Joi.string().valid('PENDING', 'PAID', 'PARTIAL'),
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'QR', 'CREDIT'),
    paymentProvider: Joi.string().valid('ESEWA', 'STRIPE', 'MANUAL'),
    paymentReference: Joi.string().allow('', null)
});

const updateItemStatusSchema = Joi.object({
    status: Joi.string().valid('PREPARING', 'READY', 'COOKED', 'SERVED').required()
});

const discountSchema = Joi.object({
    discount: Joi.number().required().min(0),
    discountType: Joi.string().valid('PERCENTAGE', 'FIXED').required()
});

const splitSchema = Joi.object({
    itemIds: Joi.array().items(Joi.string()).required().min(1)
});

const mergeSchema = Joi.object({
    sourceOrderId: Joi.string().required(),
    targetOrderId: Joi.string().required()
});

// All routes require authentication
router.use(authenticate);

router.route('/')
    .get(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER', 'CASHIER'), getOrders)
    .post(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER', 'CASHIER'), validate(createOrderSchema), createOrder);

router.route('/active/table/:tableId')
    .get(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER', 'CASHIER'), getActiveOrderByTable);

router.route('/merge')
    .post(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER', 'CASHIER'), validate(mergeSchema), mergeOrders);

// Specific routes must come before generic /:id route
router.patch('/:id/mark-bill-printed', 
    authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER'), 
    markBillPrinted
);

router.route('/:id/status')
    .put(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER', 'CASHIER'), validate(updateStatusSchema), updateOrderStatus);

router.route('/:id/items/:itemId/status')
    .put(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER', 'CASHIER'), validate(updateItemStatusSchema), updateOrderItemStatus);

router.route('/:id/append')
    .put(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER', 'CASHIER'), validate(createOrderSchema), addItemsToOrder);

router.route('/:id/discount')
    .put(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER', 'CASHIER'), validate(discountSchema), applyDiscount);

router.route('/:id/split')
    .post(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER', 'CASHIER'), validate(splitSchema), splitOrder);

router.route('/:id')
    .get(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN', 'WAITER', 'CASHIER'), getOrder);

module.exports = router;
