const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const { errorHandler } = require('./middlewares/error.middleware');
const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const menuItemRoutes = require('./routes/menuItem.routes');
const tableRoutes = require('./routes/table.routes');
const orderRoutes = require('./routes/order.routes');
const restaurantRoutes = require('./routes/restaurant.routes');
const paymentRoutes = require('./routes/payment.routes');
const cashDrawerRoutes = require('./routes/cashDrawer.routes');
const paymentQueueRoutes = require('./routes/paymentQueue.routes');
const auditRoutes = require('./routes/audit.routes');

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
