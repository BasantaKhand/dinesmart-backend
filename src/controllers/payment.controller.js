const Order = require('../models/Order');
const Table = require('../models/Table');

exports.handleEsewaWebhook = async (req, res) => {
    try {
        const secret = process.env.ESEWA_WEBHOOK_SECRET;
        if (secret && req.headers['x-webhook-secret'] !== secret) {
            return res.status(401).json({ success: false, message: 'Unauthorized webhook' });
        }

        const { orderNumber, transactionId, amount, status } = req.body || {};
        if (!orderNumber || !transactionId) {
            return res.status(400).json({ success: false, message: 'Missing orderNumber or transactionId' });
        }

        if (status && status !== 'SUCCESS') {
            return res.status(200).json({ success: true, message: 'Payment not successful' });
        }

        const order = await Order.findOne({ orderNumber });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (amount && Number(amount) !== Number(order.total)) {
            return res.status(400).json({ success: false, message: 'Amount mismatch' });
        }

        order.paymentStatus = 'PAID';
        order.paymentMethod = 'QR';
        order.paymentProvider = 'ESEWA';
        order.paymentReference = transactionId;
        order.status = 'COMPLETED';
        await order.save();

        if (order.tableId) {
            await Table.findByIdAndUpdate(order.tableId, { status: 'AVAILABLE' });
        }

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
