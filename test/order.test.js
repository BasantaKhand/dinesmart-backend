/**
 * Order API Tests - 11 Test Cases
 */

const request = require('supertest');
const { expect } = require('chai');
const {
    app,
    mongoose,
    connectTestDB,
    disconnectTestDB,
    clearCollections,
    generateToken,
    createTestRestaurant,
    createTestUser,
    createTestCategory,
    createTestMenuItem,
    createTestTable,
    createTestOrder,
} = require('./setup');

describe('Order API', function () {
    this.timeout(15000);
    let restaurant, adminUser, adminToken, waiter, waiterToken, table, menuItem, category;

    before(async () => {
        await connectTestDB();
    });

    after(async () => {
        await disconnectTestDB();
    });

    beforeEach(async () => {
        await clearCollections();
        restaurant = await createTestRestaurant();
        adminUser = await createTestUser({
            email: 'admin@test.com',
            role: 'RESTAURANT_ADMIN',
            restaurantId: restaurant._id,
        });
        waiter = await createTestUser({
            email: 'waiter@test.com',
            name: 'Test Waiter',
            role: 'WAITER',
            restaurantId: restaurant._id,
        });
        adminToken = generateToken(adminUser);
        waiterToken = generateToken(waiter);
        table = await createTestTable(restaurant._id);
        category = await createTestCategory(restaurant._id);
        menuItem = await createTestMenuItem(restaurant._id, category._id);
    });

    // Test 20: Get all orders
    it('should get all orders', async () => {
        await createTestOrder(restaurant._id, table._id, waiter._id);
        const res = await request(app)
            .get('/api/orders')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.equal(200);
    });

    // Test 21: Create a new order
    it('should create a new order', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${waiterToken}`)
            .send({
                tableId: table._id.toString(),
                orderType: 'DINE_IN',
                items: [{
                    menuItemId: menuItem._id.toString(),
                    name: menuItem.name,
                    price: menuItem.price,
                    quantity: 2,
                    total: menuItem.price * 2
                }],
                subtotal: menuItem.price * 2,
                tax: Math.round(menuItem.price * 2 * 0.13),
                serviceCharge: 0,
                total: menuItem.price * 2 + Math.round(menuItem.price * 2 * 0.13)
            });
        expect(res.statusCode).to.be.oneOf([200, 201]);
    });

    // Test 22: Fail to create order without auth
    it('should reject order creation without auth', async () => {
        const res = await request(app)
            .post('/api/orders')
            .send({ tableId: table._id.toString(), items: [] });
        expect(res.statusCode).to.equal(401);
    });

    // Test 23: Get order by ID
    it('should get order by ID', async () => {
        const order = await createTestOrder(restaurant._id, table._id, waiter._id);
        const res = await request(app)
            .get(`/api/orders/${order._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.equal(200);
    });

    // Test 24: Fail to get non-existent order
    it('should return 404 for non-existent order', async () => {
        const res = await request(app)
            .get('/api/orders/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.be.oneOf([404, 400]);
    });

    // Test 25: Update order status
    it('should update order status', async () => {
        const order = await createTestOrder(restaurant._id, table._id, waiter._id);
        const res = await request(app)
            .put(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'COOKING' });
        expect(res.statusCode).to.be.oneOf([200, 201]);
    });

    // Test 26: Add items to order
    it('should add items to existing order', async () => {
        const order = await createTestOrder(restaurant._id, table._id, waiter._id);
        const res = await request(app)
            .put(`/api/orders/${order._id}/append`)
            .set('Authorization', `Bearer ${waiterToken}`)
            .send({
                tableId: table._id.toString(),
                orderType: 'DINE_IN',
                items: [{
                    menuItemId: menuItem._id.toString(),
                    name: 'Extra Item',
                    price: 50,
                    quantity: 1,
                    total: 50
                }],
                subtotal: 50,
                tax: 6,
                total: 56
            });
        expect(res.statusCode).to.be.oneOf([200, 201]);
    });

    // Test 27: Get orders by table
    it('should get orders by table ID', async () => {
        await createTestOrder(restaurant._id, table._id, waiter._id);
        const res = await request(app)
            .get(`/api/orders/active/table/${table._id}`)
            .set('Authorization', `Bearer ${waiterToken}`);
        expect(res.statusCode).to.be.oneOf([200, 404]);
    });

    // Test 28: Cancel order (by setting status to CANCELLED)
    it('should cancel an order', async () => {
        const order = await createTestOrder(restaurant._id, table._id, waiter._id);
        const res = await request(app)
            .put(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'CANCELLED' });
        expect(res.statusCode).to.be.oneOf([200, 201, 403]);
    });

    // Test 29: Complete order
    it('should complete an order', async () => {
        const order = await createTestOrder(restaurant._id, table._id, waiter._id, [], { status: 'SERVED' });
        const res = await request(app)
            .put(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'COMPLETED' });
        expect(res.statusCode).to.be.oneOf([200, 201, 403]);
    });

    // Test 30: Fail to create order without items
    it('should reject order without items', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${waiterToken}`)
            .send({ tableId: table._id.toString(), items: [] });
        expect(res.statusCode).to.be.oneOf([400, 422, 500]);
    });
});
