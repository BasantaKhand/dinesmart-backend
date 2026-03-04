/**
 * Table API Tests - 8 Test Cases
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
    createTestTable,
} = require('./setup');

describe('Table API', function () {
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

    // Test 31: Get all tables
    it('should get all tables', async () => {
        await createTestTable(restaurant._id);
        const res = await request(app)
            .get('/api/tables')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.equal(200);
    });

    // Test 32: Create a table
    it('should create a new table', async () => {
        const res = await request(app)
            .post('/api/tables')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                number: 'T-10',
                capacity: 6,
                status: 'AVAILABLE'
            });
        expect(res.statusCode).to.be.oneOf([200, 201]);
    });

    // Test 33: Fail to create table without auth
    it('should reject table creation without auth', async () => {
        const res = await request(app)
            .post('/api/tables')
            .send({ number: 'T-10', capacity: 4 });
        expect(res.statusCode).to.equal(401);
    });

    // Test 34: Get table by ID
    it('should get table by ID', async () => {
        const table = await createTestTable(restaurant._id);
        const res = await request(app)
            .get(`/api/tables/${table._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.equal(200);
    });

    // Test 35: Update table
    it('should update a table', async () => {
        const table = await createTestTable(restaurant._id);
        const res = await request(app)
            .put(`/api/tables/${table._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ capacity: 8 });
        expect(res.statusCode).to.equal(200);
    });

    // Test 36: Delete table
    it('should delete a table', async () => {
        const table = await createTestTable(restaurant._id);
        const res = await request(app)
            .delete(`/api/tables/${table._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.be.oneOf([200, 204]);
    });

    // Test 37: Update table status (via PUT)
    it('should update table status', async () => {
        const table = await createTestTable(restaurant._id);
        const res = await request(app)
            .put(`/api/tables/${table._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'OCCUPIED' });
        expect(res.statusCode).to.be.oneOf([200, 201]);
    });

    // Test 38: Fail to get non-existent table
    it('should return 404 for non-existent table', async () => {
        const res = await request(app)
            .get('/api/tables/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.be.oneOf([404, 400]);
    });
});
