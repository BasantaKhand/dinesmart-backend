/**
 * Menu Item API Tests - 8 Test Cases
 */

const request = require('supertest');
const { expect } = require('chai');
const {
    app,
    connectTestDB,
    disconnectTestDB,
    clearCollections,
    generateToken,
    createTestRestaurant,
    createTestUser,
    createTestCategory,
    createTestMenuItem,
} = require('./setup');

describe('Menu Item API', function () {
    this.timeout(15000);
    let restaurant, adminUser, adminToken, category;

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
        adminToken = generateToken(adminUser);
        category = await createTestCategory(restaurant._id);
    });

    // Test 39: Get all menu items
    it('should get all menu items', async () => {
        await createTestMenuItem(restaurant._id, category._id);
        const res = await request(app)
            .get('/api/menu-items')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.equal(200);
    });

    // Test 40: Create a menu item
    it('should create a new menu item', async () => {
        const res = await request(app)
            .post('/api/menu-items')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'New Dish',
                description: 'Delicious dish',
                price: 150,
                categoryId: category._id.toString(),
                status: 'Active'
            });
        expect(res.statusCode).to.be.oneOf([200, 201]);
    });

    // Test 41: Fail to create item without auth
    it('should reject menu item creation without auth', async () => {
        const res = await request(app)
            .post('/api/menu-items')
            .send({ name: 'Dish', price: 100 });
        expect(res.statusCode).to.equal(401);
    });

    // Test 42: Get menu item by ID
    it('should get menu item by ID', async () => {
        const item = await createTestMenuItem(restaurant._id, category._id);
        const res = await request(app)
            .get(`/api/menu-items/${item._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.equal(200);
    });

    // Test 43: Update menu item
    it('should update a menu item', async () => {
        const item = await createTestMenuItem(restaurant._id, category._id);
        const res = await request(app)
            .put(`/api/menu-items/${item._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ price: 200 });
        expect(res.statusCode).to.equal(200);
    });

    // Test 44: Delete menu item
    it('should delete a menu item', async () => {
        const item = await createTestMenuItem(restaurant._id, category._id);
        const res = await request(app)
            .delete(`/api/menu-items/${item._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.be.oneOf([200, 204]);
    });

    // Test 45: Get menu items (filtering)
    it('should get menu items with filtering', async () => {
        await createTestMenuItem(restaurant._id, category._id);
        const res = await request(app)
            .get(`/api/menu-items?categoryId=${category._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.equal(200);
    });

    // Test 46: Fail to create item without name
    it('should reject menu item without name', async () => {
        const res = await request(app)
            .post('/api/menu-items')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ price: 100, categoryId: category._id.toString() });
        expect(res.statusCode).to.be.oneOf([400, 422, 500]);
    });
});
