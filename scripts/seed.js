const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Restaurant = require('../src/models/Restaurant');
const User = require('../src/models/User');
const fs = require('fs');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        await Restaurant.deleteMany();
        await User.deleteMany();
        console.log('Existing data cleared.');

        const restaurant1 = await Restaurant.create({
            name: 'Active Restaurant',
            address: '123 Food Street',
            status: 'ACTIVE',
            paymentSettings: {
                provider: 'ESEWA',
                qrCodeUrl: '',
                accountName: '',
                accountId: '',
                notes: ''
            }
        });

        const restaurant2 = await Restaurant.create({
            name: 'Pending Restaurant',
            address: '456 Wait Avenue',
            status: 'PENDING',
        });

        const restaurant3 = await Restaurant.create({
            name: 'Suspended Restaurant',
            address: '789 Blocked Rd',
            status: 'SUSPENDED',
        });

        console.log('Restaurants seeded.');

        await User.create({
            name: 'Super Admin',
            email: 'superadmin@demo.com',
            password: 'Password@123',
            role: 'SUPERADMIN',
        });

        await User.create({
            name: 'Restaurant Owner',
            email: 'owner@active.com',
            password: 'Password@123',
            role: 'RESTAURANT_ADMIN',
            restaurantId: restaurant1._id,
        });

        await User.create({
            name: 'Waiter One',
            email: 'waiter@active.com',
            password: 'Password@123',
            role: 'WAITER',
            restaurantId: restaurant1._id,
        });

        await User.create({
            name: 'Cashier One',
            email: 'cashier@active.com',
            password: 'Password@123',
            role: 'CASHIER',
            restaurantId: restaurant1._id,
        });

        await User.create({
            name: 'Pending Owner',
            email: 'owner@pending.com',
            password: 'Password@123',
            role: 'RESTAURANT_ADMIN',
            restaurantId: restaurant2._id,
        });

        console.log('Users seeded.');
        console.log('Seeding completed successfully!');
        process.exit();
    } catch (error) {
        const errorData = {
            message: error.message,
            stack: error.stack,
            errors: error.errors ? Object.values(error.errors).map(e => ({ path: e.path, message: e.message })) : null
        };
        fs.writeFileSync('seed_error.json', JSON.stringify(errorData, null, 2));
        console.error('Seeding failed. Check seed_error.json');
        process.exit(1);
    }
};

seedData();
