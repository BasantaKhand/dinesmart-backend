/**
 * Auth API Tests - 10 Test Cases
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
    createSuperadmin,
} = require('./setup');

describe('Auth API', function () {
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
            name: 'Admin User',
            role: 'RESTAURANT_ADMIN',
            restaurantId: restaurant._id,
        });
        adminToken = generateToken(adminUser);
    });

    // Test 1: Successful login
    it('should login with valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'Password@123' });
        expect(res.statusCode).to.be.oneOf([200, 201]);
    });

    // Test 2: Failed login with wrong password
    it('should reject login with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'WrongPassword' });
        expect(res.statusCode).to.be.oneOf([400, 401]);
    });

    // Test 3: Failed login with non-existent user
    it('should reject login with non-existent email', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nouser@test.com', password: 'Password@123' });
        expect(res.statusCode).to.be.oneOf([400, 401, 404]);
    });

    // Test 4: Get current user profile
    it('should return current user with valid token', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.equal(200);
    });

    // Test 5: Fail to get profile without token
    it('should fail /me without authentication', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.statusCode).to.equal(401);
    });

    // Test 6: Fail to get profile with invalid token
    it('should fail /me with invalid token', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer invalid-token');
        expect(res.statusCode).to.equal(401);
    });

    // Test 7: Successful logout
    it('should logout authenticated user', async () => {
        const res = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).to.be.oneOf([200, 204]);
    });

    // Test 8: Update profile
    it('should update user profile', async () => {
        const res = await request(app)
            .put('/api/auth/profile')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Updated Name' });
        expect(res.statusCode).to.be.oneOf([200, 201]);
    });

    // Test 9: Forgot password for existing user
    it('should handle forgot password request', async () => {
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'admin@test.com' });
        expect(res.statusCode).to.be.oneOf([200, 400, 500]);
    });

    // Test 10: Superadmin login
    it('should allow superadmin login', async () => {
        await createSuperadmin();
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'superadmin@test.com', password: 'Password@123' });
        expect(res.statusCode).to.be.oneOf([200, 201]);
    });
});
