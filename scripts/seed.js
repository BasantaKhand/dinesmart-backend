const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const Restaurant = require('../src/infrastructure/db/models/Restaurant');
const User = require('../src/infrastructure/db/models/User');
const Category = require('../src/infrastructure/db/models/Category');
const MenuItem = require('../src/infrastructure/db/models/MenuItem');
const Table = require('../src/infrastructure/db/models/Table');
const Order = require('../src/infrastructure/db/models/Order');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        await Restaurant.deleteMany();
        await User.deleteMany();
        await Category.deleteMany();
        await MenuItem.deleteMany();
        await Table.deleteMany();
        await Order.deleteMany();
        console.log('Existing data cleared.');

        const activeRestaurant = await Restaurant.create({
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

        console.log('Restaurants seeded.');

        await User.create({
            name: 'Super Admin',
            email: 'superadmin@demo.com',
            password: 'Password@123',
            role: 'SUPERADMIN',
        });

        const owner = await User.create({
            name: 'Restaurant Owner',
            email: 'owner@active.com',
            password: 'Password@123',
            role: 'RESTAURANT_ADMIN',
            restaurantId: activeRestaurant._id,
        });

        const waiter = await User.create({
            name: 'Waiter One',
            email: 'waiter@active.com',
            password: 'Password@123',
            role: 'WAITER',
            restaurantId: activeRestaurant._id,
        });

        await User.create({
            name: 'Cashier One',
            email: 'cashier@active.com',
            password: 'Password@123',
            role: 'CASHIER',
            restaurantId: activeRestaurant._id,
        });

        console.log('Users seeded.');

        const breakfast = await Category.create({
            name: 'Breakfast',
            slug: 'breakfast',
            description: 'Start your day with our breakfast specials',
            image: 'https://images.unsplash.com/photo-1525351484163-7529414344d7?w=400',
            status: 'Active',
            restaurantId: activeRestaurant._id,
        });

        const mainCourse = await Category.create({
            name: 'Main Course',
            slug: 'main-course',
            description: 'Delicious main dishes',
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
            status: 'Active',
            restaurantId: activeRestaurant._id,
        });

        const desserts = await Category.create({
            name: 'Desserts',
            slug: 'desserts',
            description: 'Sweet treats and desserts',
            image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
            status: 'Active',
            restaurantId: activeRestaurant._id,
        });

        const beverages = await Category.create({
            name: 'Beverages',
            slug: 'beverages',
            description: 'Drinks and beverages',
            image: 'https://images.unsplash.com/photo-1544432415-c45a27c9b341?w=400',
            status: 'Active',
            restaurantId: activeRestaurant._id,
        });

        console.log('Categories seeded.');

        await MenuItem.insertMany([
            { name: 'Fluffy Pancakes', description: 'Stack of fluffy pancakes with maple syrup and butter', price: 350, categoryId: breakfast._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1600080946577-3d79d8077b3f?w=300' },
            { name: 'Eggs Benedict', description: 'Poached eggs on English muffin with hollandaise sauce', price: 420, categoryId: breakfast._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=300' },
            { name: 'Veggie Omelette', description: 'Fresh vegetable omelette with cheese', price: 300, categoryId: breakfast._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1585521537000-dd8e5d7a1f05?w=300' },
            { name: 'Grilled Salmon', description: 'Atlantic salmon fillet with lemon butter sauce', price: 750, categoryId: mainCourse._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300' },
            { name: 'Chicken Tikka Masala', description: 'Tender chicken in creamy tomato curry sauce', price: 520, categoryId: mainCourse._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300' },
            { name: 'Beef Steak', description: 'Prime cut beef steak with garlic mashed potatoes', price: 880, categoryId: mainCourse._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=300' },
            { name: 'Vegetable Biryani', description: 'Fragrant rice dish with mixed vegetables and spices', price: 380, categoryId: mainCourse._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1682805589619-aa39db139f91?w=300' },
            { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center', price: 280, categoryId: desserts._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300' },
            { name: 'Cheesecake', description: 'Classic New York cheesecake with berry topping', price: 330, categoryId: desserts._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300' },
            { name: 'Mango Sorbet', description: 'Refreshing frozen mango dessert', price: 200, categoryId: desserts._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300' },
            { name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice', price: 150, categoryId: beverages._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300' },
            { name: 'Iced Coffee', description: 'Cold brew coffee with ice and cream', price: 180, categoryId: beverages._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300' },
            { name: 'Mango Lassi', description: 'Traditional yogurt-based mango drink', price: 120, categoryId: beverages._id, status: 'Active', restaurantId: activeRestaurant._id, image: 'https://images.unsplash.com/photo-1585518419759-53b5aba1c97e?w=300' },
        ]);

        console.log('Menu items seeded.');

        const tables = [];
        for (let i = 1; i <= 12; i++) {
            tables.push({
                number: `T-${i.toString().padStart(2, '0')}`,
                capacity: Math.ceil(Math.random() * 6) + 2,
                status: 'AVAILABLE',
                restaurantId: activeRestaurant._id,
            });
        }
        await Table.insertMany(tables);
        console.log('Tables seeded.');

        console.log('\n✅ Seeding completed successfully!');
        console.log('\n📝 Login Credentials:');
        console.log('---');
        console.log('Superadmin:');
        console.log('  Email: superadmin@demo.com');
        console.log('  Password: Password@123');
        console.log('\nOwner:');
        console.log('  Email: owner@active.com');
        console.log('  Password: Password@123');
        console.log('\nWaiter:');
        console.log('  Email: waiter@active.com');
        console.log('  Password: Password@123');
        console.log('\nCashier:');
        console.log('  Email: cashier@active.com');
        console.log('  Password: Password@123');
        console.log('---\n');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        const errorData = {
            message: error.message,
            stack: error.stack,
            errors: error.errors ? Object.values(error.errors).map((e) => ({ path: e.path, message: e.message })) : null
        };
        fs.writeFileSync('seed_error.json', JSON.stringify(errorData, null, 2));
        console.error('❌ Seeding failed. Check seed_error.json');
        process.exit(1);
    }
};

seedData();
