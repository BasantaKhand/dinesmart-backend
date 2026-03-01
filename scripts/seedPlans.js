const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import model
const SubscriptionPlan = require('../src/infrastructure/db/models/SubscriptionPlan');

const plans = [
    {
        name: 'Starter',
        slug: 'starter',
        description: 'Perfect for small restaurants just getting started',
        price: 1999,
        currency: 'NPR',
        billingCycle: 'MONTHLY',
        features: [
            'Up to 10 tables',
            'Up to 5 staff members',
            'Basic POS features',
            'Order management',
            'Daily reports',
            'Email support'
        ],
        limits: {
            maxTables: 10,
            maxStaff: 5,
            maxMenuItems: 50,
            maxOrdersPerMonth: 500
        },
        isPopular: false,
        isActive: true,
        sortOrder: 1
    },
    {
        name: 'Professional',
        slug: 'professional',
        description: 'Best for growing restaurants with more staff',
        price: 4999,
        currency: 'NPR',
        billingCycle: 'MONTHLY',
        features: [
            'Up to 30 tables',
            'Up to 15 staff members',
            'Full POS features',
            'Kitchen display system',
            'Advanced analytics',
            'eSewa payment integration',
            'Priority support',
            'Custom QR codes'
        ],
        limits: {
            maxTables: 30,
            maxStaff: 15,
            maxMenuItems: 200,
            maxOrdersPerMonth: 2000
        },
        isPopular: true,
        isActive: true,
        sortOrder: 2
    },
    {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'For large restaurants and chains',
        price: 9999,
        currency: 'NPR',
        billingCycle: 'MONTHLY',
        features: [
            'Unlimited tables',
            'Unlimited staff',
            'All POS features',
            'Multi-branch support',
            'Real-time analytics',
            'All payment integrations',
            'Dedicated support',
            'Custom integrations',
            'White-label option',
            'API access'
        ],
        limits: {
            maxTables: -1, // Unlimited
            maxStaff: -1,
            maxMenuItems: -1,
            maxOrdersPerMonth: -1
        },
        isPopular: false,
        isActive: true,
        sortOrder: 3
    }
];

const seedPlans = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing plans
        await SubscriptionPlan.deleteMany({});
        console.log('Cleared existing subscription plans');

        // Insert new plans
        const createdPlans = await SubscriptionPlan.insertMany(plans);
        console.log(`Created ${createdPlans.length} subscription plans:`);
        createdPlans.forEach(plan => {
            console.log(`  - ${plan.name}: NPR ${plan.price}/month`);
        });

        console.log('\nSubscription plans seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding plans:', error);
        process.exit(1);
    }
};

seedPlans();
