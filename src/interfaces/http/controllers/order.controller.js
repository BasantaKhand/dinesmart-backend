const di = require('../../../config/di');

exports.createOrder = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const order = await di.orderUseCases.createOrder(req.body, req.user, io);
    res.status(201).json({ success: true, data: order });
  } catch (error) { next(error); }
};

exports.getOrders = async (req, res, next) => {
  try {
    const result = await di.orderUseCases.getOrders(req.user.restaurantId, req.query);
    res.status(200).json({ success: true, data: result.orders, totalPages: result.totalPages, currentPage: result.currentPage });
  } catch (error) { next(error); }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = await di.orderUseCases.getOrder(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

exports.getActiveOrderByTable = async (req, res, next) => {
  try {
    const order = await di.orderUseCases.getActiveOrderByTable(req.params.tableId, req.user.restaurantId);
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

exports.addItemsToOrder = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const order = await di.orderUseCases.addItemsToOrder(req.params.id, req.body, req.user, io);
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const order = await di.orderUseCases.updateOrderStatus(req.params.id, req.body, req.user, di.auditUseCases, io);
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

exports.updateOrderItemStatus = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const order = await di.orderUseCases.updateOrderItemStatus(req.params.orderId, req.params.itemId, req.body, req.user, io);
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

exports.applyDiscount = async (req, res, next) => {
  try {
    const order = await di.orderUseCases.applyDiscount(req.params.id, req.body, req.user.restaurantId);
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

exports.splitOrder = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const result = await di.orderUseCases.splitOrder(req.params.id, req.body, req.user, io);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

exports.mergeOrders = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const order = await di.orderUseCases.mergeOrders(req.body, req.user, io);
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

exports.markBillPrinted = async (req, res, next) => {
  try {
    const order = await di.orderUseCases.markBillPrinted(req.params.id, req.user.restaurantId);
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};
