/**
 * Category API Tests - 9 Test Cases
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
} = require('./setup');

describe('Category API', function () {
    this.timeout(15000);
    let restaurant, adminUser, adminToken;

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
    });

    // Test 11: Get all categories
    it('should get all categories', async () => {
        await createTestCategory(restaurant._id);
        const res = await request(app)
            .get('/api/categories')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.equal(200);
    });

    // Test 12: Create a category
    it('should create a new category', async () => {
        const res = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Appetizers',
                description: 'Starter dishes',
                status: 'Active'
            });
        expect(res.statusCode).to.be.oneOf([200, 201]);
    });

    // Test 13: Fail to create category without auth
    it('should reject category creation without auth', async () => {
        const res = await request(app)
            .post('/api/categories')
            .send({ name: 'Appetizers', slug: 'appetizers' });
        expect(res.statusCode).to.equal(401);
    });

    // Test 14: Get category by ID
    it('should get category by ID', async () => {
        const category = await createTestCategory(restaurant._id);
        const res = await request(app)
            .get(`/api/categories/${category._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.equal(200);
    });

    // Test 15: Fail to get non-existent category
    it('should return 404 for non-existent category', async () => {
        const res = await request(app)
            .get('/api/categories/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.be.oneOf([404, 400]);
    });

    // Test 16: Update category
    it('should update a category', async () => {
        const category = await createTestCategory(restaurant._id);
        const res = await request(app)
            .put(`/api/categories/${category._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Updated Category' });
        expect(res.statusCode).to.equal(200);
    });

    // Test 17: Delete category
    it('should delete a category', async () => {
        const category = await createTestCategory(restaurant._id);
        const res = await request(app)
            .delete(`/api/categories/${category._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.be.oneOf([200, 204]);
    });

    // Test 18: Fail to create duplicate slug
    it('should reject duplicate category slug', async () => {
        await createTestCategory(restaurant._id, { slug: 'unique-slug' });
        const res = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Another', slug: 'unique-slug' });
        expect(res.statusCode).to.be.oneOf([400, 409, 500]);
    });

    // Test 19: Fail to create category with missing name
    it('should reject category without name', async () => {
        const res = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ slug: 'no-name' });
        expect(res.statusCode).to.be.oneOf([400, 422, 500]);
    });
});
