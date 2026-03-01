const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const { errorHandler } = require('./interfaces/http/middlewares/error.middleware');
const authRoutes = require('./interfaces/http/routes/auth.routes');
const categoryRoutes = require('./interfaces/http/routes/category.routes');
const menuItemRoutes = require('./interfaces/http/routes/menuItem.routes');
const tableRoutes = require('./interfaces/http/routes/table.routes');
const orderRoutes = require('./interfaces/http/routes/order.routes');
const restaurantRoutes = require('./interfaces/http/routes/restaurant.routes');
const paymentRoutes = require('./interfaces/http/routes/payment.routes');
const cashDrawerRoutes = require('./interfaces/http/routes/cashDrawer.routes');
const paymentQueueRoutes = require('./interfaces/http/routes/paymentQueue.routes');
const auditRoutes = require('./interfaces/http/routes/audit.routes');
const dashboardRoutes = require('./interfaces/http/routes/dashboard.routes');
const superadminRoutes = require('./interfaces/http/routes/superadmin.routes');
const contactRoutes = require('./interfaces/http/routes/contact.routes');
const notificationRoutes = require('./interfaces/http/routes/notification.routes');
const staffRoutes = require('./interfaces/http/routes/staff.routes');
const subscriptionRoutes = require('./interfaces/http/routes/subscription.routes');
const checkoutRoutes = require('./interfaces/http/routes/checkout.routes');
const inquiryRoutes = require('./interfaces/http/routes/inquiry.routes');

// Load env vars
dotenv.config();

const app = express();

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cash-drawer', cashDrawerRoutes);
app.use('/api/payment-queue', paymentQueueRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/inquiries', inquiryRoutes);

// Base route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to DineSmart POS API',
    });
});

// Error handler
app.use(errorHandler);

module.exports = app;
