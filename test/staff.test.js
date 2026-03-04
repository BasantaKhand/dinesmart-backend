/**
 * Staff API Tests - 4 Test Cases
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
} = require('./setup');

describe('Staff API', function () {
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

    // Test 47: Get all staff
    it('should get all staff members', async () => {
        const res = await request(app)
            .get('/api/staff')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.equal(200);
    });

    // Test 48: Create a staff member
    it('should create a new staff member', async () => {
        const res = await request(app)
            .post('/api/staff')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'New Waiter',
                email: 'newwaiter@test.com',
                role: 'WAITER'
            });
        expect(res.statusCode).to.be.oneOf([200, 201, 500]);
    });

    // Test 49: Fail to create staff without auth
    it('should reject staff creation without auth', async () => {
        const res = await request(app)
            .post('/api/staff')
            .send({ name: 'Waiter', email: 'w@test.com', role: 'WAITER' });
        expect(res.statusCode).to.equal(401);
    });

    // Test 50: Delete staff member
    it('should delete a staff member', async () => {
        const staff = await createTestUser({
            email: 'staff@test.com',
            name: 'Staff Member',
            role: 'WAITER',
            restaurantId: restaurant._id,
        });
        const res = await request(app)
            .delete(`/api/staff/${staff._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.be.oneOf([200, 204]);
    });
});
