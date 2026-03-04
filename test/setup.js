/**
 * Test Setup and Configuration
 * This file provides common utilities for all test files
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './.env.test' });
dotenv.config({ path: './.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Import Models
const Restaurant = require('../src/infrastructure/db/models/Restaurant');
const User = require('../src/infrastructure/db/models/User');
const Category = require('../src/infrastructure/db/models/Category');
const MenuItem = require('../src/infrastructure/db/models/MenuItem');
const Table = require('../src/infrastructure/db/models/Table');
const Order = require('../src/infrastructure/db/models/Order');

// Import Express App
const app = require('../src/app');

/**
 * Connect to test database
 */
const connectTestDB = async () => {
    const mongoUri = process.env.MONGO_URI_TEST || process.env.MONGO_URI || 'mongodb://localhost:27017/dinesmart_test_db';
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
        console.log(`Connected to test MongoDB: ${mongoose.connection.name}`);
    }
};

/**
 * Disconnect from test database
 */
const disconnectTestDB = async () => {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        console.log('Dropped test database and closed connection.');
    }
};

/**
 * Clear all collections
 */
const clearCollections = async () => {
    if (mongoose.connection.readyState !== 1) {
        console.warn('MongoDB not connected, skipping collection cleanup.');
        return;
    }
    await Restaurant.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await MenuItem.deleteMany({});
    await Table.deleteMany({});
    await Order.deleteMany({});
};

/**
 * Generate JWT token for a user (matches the app's token structure)
 */
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id.toString() },
        JWT_SECRET,
        { expiresIn: '1d' }
    );
};

/**
 * Create a test restaurant
 */
const createTestRestaurant = async (overrides = {}) => {
    return await Restaurant.create({
        name: 'Test Restaurant',
        address: '123 Test Street',
        status: 'ACTIVE',
        paymentSettings: {
            provider: 'MANUAL',
            qrCodeUrl: '',
            accountName: '',
            accountId: '',
            notes: ''
        },
        ...overrides
    });
};

/**
 * Create a test user (password is hashed by the model's pre-save hook)
 */
const createTestUser = async (overrides = {}) => {
    const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: overrides.password || 'Password@123',
        role: 'RESTAURANT_ADMIN',
        status: 'ACTIVE',
        ...overrides
    };
    return await User.create(userData);
};

/**
 * Create a superadmin user
 */
const createSuperadmin = async () => {
    return await User.create({
        name: 'Superadmin',
        email: 'superadmin@test.com',
        password: 'Password@123',
        role: 'SUPERADMIN',
        status: 'ACTIVE',
    });
};

/**
 * Create a test category
 */
const createTestCategory = async (restaurantId, overrides = {}) => {
    return await Category.create({
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test category description',
        image: 'https://example.com/image.jpg',
        status: 'Active',
        restaurantId,
        ...overrides
    });
};

/**
 * Create a test menu item
 */
const createTestMenuItem = async (restaurantId, categoryId, overrides = {}) => {
    return await MenuItem.create({
        name: 'Test Menu Item',
        description: 'Test item description',
        price: 100,
        image: 'https://example.com/food.jpg',
        status: 'Active',
        restaurantId,
        categoryId,
        ...overrides
    });
};

/**
 * Create a test table
 */
const createTestTable = async (restaurantId, overrides = {}) => {
    return await Table.create({
        number: 'T-01',
        capacity: 4,
        status: 'AVAILABLE',
        restaurantId,
        ...overrides
    });
};

/**
 * Create a test order
 */
const createTestOrder = async (restaurantId, tableId, waiterId, items = [], overrides = {}) => {
    const defaultItems = items.length > 0 ? items : [{
        menuItemId: new mongoose.Types.ObjectId(),
        name: 'Test Item',
        price: 100,
        quantity: 2,
        total: 200,
    }];

    return await Order.create({
        restaurantId,
        tableId,
        waiterId,
        orderNumber: `ORD-${Date.now()}`,
        items: defaultItems,
        orderType: 'DINE_IN',
        subtotal: 200,
        tax: 26,
        serviceCharge: 20,
        total: 246,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        ...overrides
    });
};

module.exports = {
    app,
    mongoose,
    JWT_SECRET,
    connectTestDB,
    disconnectTestDB,
    clearCollections,
    generateToken,
    createTestRestaurant,
    createTestUser,
    createSuperadmin,
    createTestCategory,
    createTestMenuItem,
    createTestTable,
    createTestOrder,
    // Models
    Restaurant,
    User,
    Category,
    MenuItem,
    Table,
    Order,
};
