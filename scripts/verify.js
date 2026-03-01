const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/infrastructure/db/models/User');
const Order = require('../src/infrastructure/db/models/Order');

dotenv.config();

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        // Get waiter and owner
        const waiter = await User.findOne({ email: 'waiter@active.com' });
        const owner = await User.findOne({ email: 'owner@active.com' });

        console.log('👤 Waiter Info:');
        console.log('  Email:', waiter?.email);
        console.log('  RestaurantId:', waiter?.restaurantId);
        console.log('  Role:', waiter?.role);

        console.log('\n👤 Owner Info:');
        console.log('  Email:', owner?.email);
        console.log('  RestaurantId:', owner?.restaurantId);
        console.log('  Role:', owner?.role);

        console.log('\n📋 All Orders in Database:');
        const allOrders = await Order.find({}).populate('tableId', 'number').populate('waiterId', 'name');
        console.log(`  Total orders: ${allOrders.length}`);
        
        allOrders.forEach((order, index) => {
            console.log(`\n  Order ${index + 1}:`);
            console.log(`    Order ID: ${order.orderNumber}`);
            console.log(`    RestaurantId: ${order.restaurantId}`);
            console.log(`    Table: ${order.tableId?.number}`);
            console.log(`    Waiter: ${order.waiterId?.name}`);
            console.log(`    Status: ${order.status}`);
            console.log(`    Items: ${order.items.length}`);
        });

        console.log('\n📋 Orders for Waiter\'s Restaurant:');
        const waiterOrders = await Order.find({ restaurantId: waiter?.restaurantId })
            .populate('tableId', 'number')
            .populate('waiterId', 'name');
        console.log(`  Total orders: ${waiterOrders.length}`);
        
        waiterOrders.forEach((order, index) => {
            console.log(`\n  Order ${index + 1}:`);
            console.log(`    Order ID: ${order.orderNumber}`);
            console.log(`    Table: ${order.tableId?.number}`);
            console.log(`    Waiter: ${order.waiterId?.name}`);
            console.log(`    Status: ${order.status}`);
        });

        console.log('\n✅ Verification complete!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

verify();
