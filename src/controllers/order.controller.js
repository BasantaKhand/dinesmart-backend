const Order = require('../models/Order');
const Table = require('../models/Table');
const auditController = require('./audit.controller');

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private (Staff/Admin)
 */
exports.createOrder = async (req, res) => {
    try {
        const {
            tableId,
            items,
            orderType,
            subtotal,
            tax,
            serviceCharge,
            total,
            notes
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No order items provided'
            });
        }

        const order = await Order.create({
            restaurantId: req.user.restaurantId,
            waiterId: req.user.id,
            tableId,
            items,
            orderType,
            subtotal,
            tax,
            serviceCharge,
            total,
            notes
        });

        // If it's a dine-in order and tableId is provided, mark table as OCCUPIED
        if (orderType === 'DINE_IN' && tableId) {
            await Table.findByIdAndUpdate(tableId, { status: 'OCCUPIED' });
        }

        res.status(201).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * @desc    Get all orders for a restaurant
 * @route   GET /api/orders
 * @access  Private (Staff/Admin)
 */
exports.getOrders = async (req, res) => {
    try {
        const { status, paymentStatus, orderType, billPrinted, page = 1, limit = 10 } = req.query;

        const query = { restaurantId: req.user.restaurantId };

        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (orderType) query.orderType = orderType;
        if (billPrinted !== undefined) query.billPrinted = billPrinted === 'true';

        const orders = await Order.find(query)
            .populate('tableId', 'number')
            .populate('waiterId', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Order.countDocuments(query);

        res.status(200).json({
            success: true,
            data: orders,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private (Staff/Admin)
 */
exports.getOrder = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId
        }).populate('tableId').populate('waiterId', 'name');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * @desc    Get active order by table ID
 * @route   GET /api/orders/active/table/:tableId
 * @access  Private (Staff/Admin)
 */
exports.getActiveOrderByTable = async (req, res) => {
    try {
        const order = await Order.findOne({
            tableId: req.params.tableId,
            restaurantId: req.user.restaurantId,
            status: { $in: ['PENDING', 'COOKING', 'SERVED'] }
        }).populate('items.menuItemId');

        if (!order) {
            return res.status(200).json({
                success: true,
                data: null,
                message: 'No active order found for this table'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * @desc    Add items to an existing order
 * @route   PUT /api/orders/:id/append
 * @access  Private (Staff/Admin)
 */
exports.addItemsToOrder = async (req, res) => {
    try {
        const { items, subtotal, tax, serviceCharge, total } = req.body;

        const order = await Order.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
            status: { $in: ['PENDING', 'COOKING', 'SERVED'] }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Active order not found'
            });
        }

        order.items.push(...items);
        order.subtotal += subtotal;
        order.tax += tax;
        order.serviceCharge += serviceCharge;
        order.total += total;

        await order.save();

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Private (Staff/Admin)
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, paymentStatus, paymentMethod, paymentProvider, paymentReference } = req.body;

        const updateData = { status };
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        if (paymentProvider) updateData.paymentProvider = paymentProvider;
        if (paymentReference !== undefined) updateData.paymentReference = paymentReference;

        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, restaurantId: req.user.restaurantId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Only release table if payment is PAID (not when order is COMPLETED)
        // Table remains OCCUPIED until cashier confirms payment
        if (paymentStatus === 'PAID' && order.tableId) {
            await Table.findByIdAndUpdate(order.tableId, { status: 'AVAILABLE' });
            
            // Log transaction for audit trail
            await auditController.logTransaction({
                restaurantId: req.user.restaurantId,
                cashierId: req.user.id || req.user._id,
                orderId: order._id,
                orderNumber: order.orderNumber,
                type: 'PAYMENT_SETTLED',
                amount: order.total,
                paymentMethod: paymentMethod || order.paymentMethod,
                paymentProvider: paymentProvider || order.paymentProvider,
                description: `Payment settled for order ${order.orderNumber}`,
                tableNumber: order.tableId?.number,
                metadata: {
                    paymentReference,
                    subtotal: order.subtotal,
                    tax: order.tax,
                    serviceCharge: order.serviceCharge,
                },
            });
        }

        // If order is CANCELLED, release the table immediately
        if (status === 'CANCELLED' && order.tableId) {
            await Table.findByIdAndUpdate(order.tableId, { status: 'AVAILABLE' });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
/**
 * @desc    Update order item status
 * @route   PUT /api/orders/:id/items/:itemId/status
 * @access  Private (Staff/Admin)
 */
exports.updateOrderItemStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { id, itemId } = req.params;

        const order = await Order.findOne({
            _id: id,
            restaurantId: req.user.restaurantId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }

        item.status = status;

        // If all items are served, we can potentially update order status, 
        // but often 'SERVED' at order level is a manual or bulk transition.
        // For now, just update the item.

        await order.save();

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * @desc    Apply discount to order
 * @route   PUT /api/orders/:id/discount
 * @access  Private (Staff/Admin)
 */
exports.applyDiscount = async (req, res) => {
    try {
        const { discount, discountType } = req.body;
        const order = await Order.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.discount = discount;
        order.discountType = discountType;

        // Recalculate total
        let discountAmount = 0;
        if (discountType === 'PERCENTAGE') {
            discountAmount = (order.subtotal * discount) / 100;
        } else {
            discountAmount = discount;
        }

        const discountedSubtotal = Math.max(0, order.subtotal - discountAmount);
        order.tax = discountedSubtotal * 0.13; // 13% VAT
        order.total = discountedSubtotal + order.tax + order.serviceCharge;

        await order.save();

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Split items from an order into a new order
 * @route   POST /api/orders/:id/split
 * @access  Private (Staff/Admin)
 */
exports.splitOrder = async (req, res) => {
    try {
        const { itemIds } = req.body; // Array of item IDs to move
        const sourceOrder = await Order.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
            status: { $in: ['PENDING', 'COOKING', 'SERVED'] }
        });

        if (!sourceOrder) {
            return res.status(404).json({ success: false, message: 'Source order not found' });
        }

        const itemsToMove = [];
        const remainingItems = [];

        sourceOrder.items.forEach(item => {
            if (itemIds.includes(item._id.toString())) {
                itemsToMove.push(item);
            } else {
                remainingItems.push(item);
            }
        });

        if (itemsToMove.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid items selected for split' });
        }

        // Create new order with moved items
        const subtotalNew = itemsToMove.reduce((sum, item) => sum + item.total, 0);
        const taxNew = subtotalNew * 0.13;
        const totalNew = subtotalNew + taxNew;

        const newOrder = await Order.create({
            restaurantId: sourceOrder.restaurantId,
            waiterId: req.user.id,
            tableId: sourceOrder.tableId,
            items: itemsToMove,
            orderType: sourceOrder.orderType,
            subtotal: subtotalNew,
            tax: taxNew,
            total: totalNew,
            status: 'PENDING'
        });

        // Update source order
        sourceOrder.items = remainingItems;
        sourceOrder.subtotal = remainingItems.reduce((sum, item) => sum + item.total, 0);
        sourceOrder.tax = sourceOrder.subtotal * 0.13;
        sourceOrder.total = sourceOrder.subtotal + sourceOrder.tax + sourceOrder.serviceCharge;

        if (remainingItems.length === 0) {
            sourceOrder.status = 'CANCELLED';
        }

        await sourceOrder.save();

        res.status(201).json({
            success: true,
            data: { sourceOrder, newOrder }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Merge items from one order into another
 * @route   POST /api/orders/merge
 * @access  Private (Staff/Admin)
 */
exports.mergeOrders = async (req, res) => {
    try {
        const { sourceOrderId, targetOrderId } = req.body;

        const sourceOrder = await Order.findOne({
            _id: sourceOrderId,
            restaurantId: req.user.restaurantId,
            status: { $in: ['PENDING', 'COOKING', 'SERVED'] }
        });

        const targetOrder = await Order.findOne({
            _id: targetOrderId,
            restaurantId: req.user.restaurantId,
            status: { $in: ['PENDING', 'COOKING', 'SERVED'] }
        });

        if (!sourceOrder || !targetOrder) {
            return res.status(404).json({ success: false, message: 'Source or Target order not found' });
        }

        // Merge items
        targetOrder.items.push(...sourceOrder.items);
        targetOrder.subtotal += sourceOrder.subtotal;
        targetOrder.tax += sourceOrder.tax;
        targetOrder.serviceCharge += sourceOrder.serviceCharge;
        targetOrder.total += sourceOrder.total;

        await targetOrder.save();

        // Cancel source order
        sourceOrder.status = 'CANCELLED';
        await sourceOrder.save();

        res.status(200).json({
            success: true,
            data: targetOrder
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Mark bill as printed
// @route   PATCH /api/orders/:id/mark-bill-printed
// @access  Private (Waiter)
exports.markBillPrinted = async (req, res) => {
    try {
        const order = await Order.findOneAndUpdate(
            { 
                _id: req.params.id,
                restaurantId: req.restaurantId
            },
            { 
                billPrinted: true,
                billPrintedAt: new Date()
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
