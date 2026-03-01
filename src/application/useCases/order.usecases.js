const { NotFoundError, ValidationError, AuthorizationError } = require('../../shared/errors');

class OrderUseCases {
  constructor({ orderRepository, tableRepository, notificationService }) {
    this.orderRepo = orderRepository;
    this.tableRepo = tableRepository;
    this.notificationService = notificationService;
  }

  async createOrder(data, user, io) {
    const { tableId, items, orderType, subtotal, tax, serviceCharge, total, notes } = data;
    if (!items || items.length === 0) throw new ValidationError('No order items provided');

    const newOrder = await this.orderRepo.create({
      restaurantId: user.restaurantId, waiterId: user.id,
      tableId, items, orderType, subtotal, tax, serviceCharge, total, notes,
    });

    const order = await this.orderRepo.findById(newOrder._id, [{ path: 'tableId' }]);

    if (orderType === 'DINE_IN' && tableId) {
      await this.tableRepo.findByIdAndUpdate(tableId, { status: 'OCCUPIED' });
    }

    await this.notificationService.notifyNewOrder(order, io);
    return order;
  }

  async getOrders(restaurantId, filters = {}) {
    const { status, paymentStatus, orderType, billPrinted, page = 1, limit = 10 } = filters;
    const query = { restaurantId };
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (orderType) query.orderType = orderType;
    if (billPrinted !== undefined) query.billPrinted = billPrinted === 'true';

    const orders = await this.orderRepo.find(query, {
      populate: [{ path: 'tableId', select: 'number' }, { path: 'waiterId', select: 'name' }],
      sort: { createdAt: -1 }, limit: limit * 1, skip: (page - 1) * limit,
    });
    const count = await this.orderRepo.countDocuments(query);
    return { orders, totalPages: Math.ceil(count / limit), currentPage: page };
  }

  async getOrder(id, restaurantId) {
    const order = await this.orderRepo.findOne(
      { _id: id, restaurantId },
      [{ path: 'tableId' }, { path: 'waiterId', select: 'name' }]
    );
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async getActiveOrderByTable(tableId, restaurantId) {
    return this.orderRepo.findOne({
      tableId, restaurantId,
      status: { $in: ['PENDING', 'COOKING', 'COOKED', 'SERVED', 'COMPLETED'] },
      paymentStatus: { $ne: 'PAID' },
    }, [{ path: 'items.menuItemId' }]);
  }

  async addItemsToOrder(id, data, user, io) {
    const { items, subtotal, tax, serviceCharge = 0, total } = data;
    const order = await this.orderRepo.findOne({ _id: id, restaurantId: user.restaurantId });
    if (!order) throw new NotFoundError('Order not found');
    if (order.status === 'COMPLETED') throw new ValidationError('Cannot add items to a completed order');
    if (order.status === 'CANCELLED') throw new ValidationError('Cannot add items to a cancelled order');

    order.items.push(...items);
    order.subtotal += subtotal || 0;
    order.tax += tax || 0;
    order.serviceCharge += serviceCharge || 0;
    order.total += total || 0;
    if (['COOKED', 'SERVED'].includes(order.status)) order.status = 'PENDING';

    await this.orderRepo.save(order);
    await this.orderRepo.populate(order, 'tableId');
    await this.notificationService.notifyItemsAdded(order, items.length, io);
    return order;
  }

  async updateOrderStatus(id, data, user, auditUseCases, io) {
    const { status, paymentStatus, paymentMethod, paymentProvider, paymentReference } = data;

    const originalOrder = await this.orderRepo.findOne({ _id: id, restaurantId: user.restaurantId });
    if (!originalOrder) throw new NotFoundError('Order not found');

    // Role-Based Status Transition Validation
    if (status && status !== originalOrder.status) {
      const userRole = user.role;
      const isAdmin = ['RESTAURANT_ADMIN', 'SUPERADMIN'].includes(userRole);
      const isWaiter = userRole === 'WAITER';

      if (['COOKING', 'COOKED'].includes(status) && !isAdmin)
        throw new AuthorizationError(`Only admins can update order status to ${status}`);
      if (['SERVED', 'COMPLETED'].includes(status)) {
        if (!isWaiter) throw new AuthorizationError(`Only waiters are responsible for updating order status to ${status}`);
        if (status === 'SERVED' && originalOrder.status !== 'COOKED') throw new ValidationError('Order must be COOKED before it can be SERVED');
        if (status === 'COMPLETED' && originalOrder.status !== 'SERVED') throw new ValidationError('Order must be SERVED before it can be COMPLETED');
      }
      if (status === 'CANCELLED') {
        if (!isWaiter) throw new AuthorizationError('Only waiters can cancel orders');
        if (originalOrder.status !== 'PENDING') throw new ValidationError('Order can only be cancelled while it is PENDING or before it starts cooking');
      }
    }

    const updateData = { status };
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (paymentProvider) updateData.paymentProvider = paymentProvider;
    if (paymentReference !== undefined) updateData.paymentReference = paymentReference;

    // Sync item statuses
    if (status === 'COOKED') {
      await this.orderRepo.updateOne(
        { _id: id, restaurantId: user.restaurantId },
        { $set: { 'items.$[elem].status': 'READY' } },
        { arrayFilters: [{ 'elem.status': 'PREPARING' }] }
      );
    } else if (status === 'COMPLETED') {
      await this.orderRepo.updateOne(
        { _id: id, restaurantId: user.restaurantId },
        { $set: { 'items.$[].status': 'READY' } }
      );
    }

    const order = await this.orderRepo.findOneAndUpdate(
      { _id: id, restaurantId: user.restaurantId }, updateData,
      { populate: [{ path: 'tableId' }] }
    );
    if (!order) throw new NotFoundError('Order not found');

    // Notifications
    if (status && status !== originalOrder.status) {
      await this.notificationService.notifyOrderStatusToWaiter(order, status, io);
      if (status === 'SERVED') await this.notificationService.notifyOrderServed(order, io);
      else if (status === 'COMPLETED') await this.notificationService.notifyOrderCompleted(order, io);
    }

    if (paymentStatus === 'PAID' && originalOrder.paymentStatus !== 'PAID') {
      await this.notificationService.notifyPaymentCompleted(order, paymentMethod || order.paymentMethod, io);
    }

    if (paymentStatus === 'PAID' && order.tableId) {
      await this.tableRepo.findByIdAndUpdate(order.tableId, { status: 'AVAILABLE' });
      await auditUseCases.logTransaction({
        restaurantId: user.restaurantId, cashierId: user.id || user._id,
        orderId: order._id, orderNumber: order.orderNumber,
        type: 'PAYMENT_SETTLED', amount: order.total,
        paymentMethod: paymentMethod || order.paymentMethod,
        paymentProvider: paymentProvider || order.paymentProvider,
        description: `Payment settled for order ${order.orderNumber}`,
        tableNumber: order.tableId?.number,
        metadata: { paymentReference, subtotal: order.subtotal, tax: order.tax, serviceCharge: order.serviceCharge },
      });
    }

    if (status === 'CANCELLED' && order.tableId) {
      await this.tableRepo.findByIdAndUpdate(order.tableId, { status: 'AVAILABLE' });
    }

    return order;
  }

  async updateOrderItemStatus(orderId, itemId, status, restaurantId) {
    const order = await this.orderRepo.findOne({ _id: orderId, restaurantId });
    if (!order) throw new NotFoundError('Order not found');

    const item = order.items.id(itemId);
    if (!item) throw new NotFoundError('Order item not found');
    item.status = status;
    await this.orderRepo.save(order);
    return order;
  }

  async applyDiscount(id, { discount, discountType }, restaurantId) {
    const order = await this.orderRepo.findOne({ _id: id, restaurantId });
    if (!order) throw new NotFoundError('Order not found');

    order.discount = discount;
    order.discountType = discountType;
    let discountAmount = discountType === 'PERCENTAGE' ? (order.subtotal * discount) / 100 : discount;
    const discountedSubtotal = Math.max(0, order.subtotal - discountAmount);
    order.tax = discountedSubtotal * 0.13;
    order.total = discountedSubtotal + order.tax + order.serviceCharge;
    await this.orderRepo.save(order);
    return order;
  }

  async splitOrder(id, { itemIds }, user) {
    const sourceOrder = await this.orderRepo.findOne({
      _id: id, restaurantId: user.restaurantId,
      status: { $in: ['PENDING', 'COOKING', 'SERVED'] },
    });
    if (!sourceOrder) throw new NotFoundError('Source order not found');

    const itemsToMove = [];
    const remainingItems = [];
    sourceOrder.items.forEach(item => {
      if (itemIds.includes(item._id.toString())) itemsToMove.push(item);
      else remainingItems.push(item);
    });
    if (itemsToMove.length === 0) throw new ValidationError('No valid items selected for split');

    const subtotalNew = itemsToMove.reduce((sum, item) => sum + item.total, 0);
    const taxNew = subtotalNew * 0.13;
    const newOrder = await this.orderRepo.create({
      restaurantId: sourceOrder.restaurantId, waiterId: user.id,
      tableId: sourceOrder.tableId, items: itemsToMove, orderType: sourceOrder.orderType,
      subtotal: subtotalNew, tax: taxNew, total: subtotalNew + taxNew, status: 'PENDING',
    });

    sourceOrder.items = remainingItems;
    sourceOrder.subtotal = remainingItems.reduce((sum, item) => sum + item.total, 0);
    sourceOrder.tax = sourceOrder.subtotal * 0.13;
    sourceOrder.total = sourceOrder.subtotal + sourceOrder.tax + sourceOrder.serviceCharge;
    if (remainingItems.length === 0) sourceOrder.status = 'CANCELLED';
    await this.orderRepo.save(sourceOrder);

    return { sourceOrder, newOrder };
  }

  async mergeOrders({ sourceOrderId, targetOrderId }, restaurantId) {
    const sourceOrder = await this.orderRepo.findOne({
      _id: sourceOrderId, restaurantId, status: { $in: ['PENDING', 'COOKING', 'SERVED'] },
    });
    const targetOrder = await this.orderRepo.findOne({
      _id: targetOrderId, restaurantId, status: { $in: ['PENDING', 'COOKING', 'SERVED'] },
    });
    if (!sourceOrder || !targetOrder) throw new NotFoundError('Source or Target order not found');

    targetOrder.items.push(...sourceOrder.items);
    targetOrder.subtotal += sourceOrder.subtotal;
    targetOrder.tax += sourceOrder.tax;
    targetOrder.serviceCharge += sourceOrder.serviceCharge;
    targetOrder.total += sourceOrder.total;
    await this.orderRepo.save(targetOrder);

    sourceOrder.status = 'CANCELLED';
    await this.orderRepo.save(sourceOrder);
    return targetOrder;
  }

  async markBillPrinted(id, restaurantId, io) {
    const order = await this.orderRepo.findOneAndUpdate(
      { _id: id, restaurantId },
      { billPrinted: true, billPrintedAt: new Date() },
      { populate: [{ path: 'tableId' }] }
    );
    if (!order) throw new NotFoundError('Order not found');
    await this.notificationService.notifyBillPrinted(order, io);
    return order;
  }
}

module.exports = OrderUseCases;
