const crypto = require('crypto');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Subscription = require('../models/Subscription');
const PaymentTransaction = require('../models/PaymentTransaction');
const Restaurant = require('../models/Restaurant');
const envConfig = require('../config/env');

// eSewa configuration from config
const ESEWA_CONFIG = envConfig.esewa;

// Generate HMAC SHA256 signature for eSewa
const generateEsewaSignature = (message) => {
    const hmac = crypto.createHmac('sha256', ESEWA_CONFIG.secretKey);
    hmac.update(message);
    return hmac.digest('base64');
};

// Generate unique transaction ID
const generateTransactionId = () => {
    return `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

// ============= SUBSCRIPTION PLANS =============

// Get all active subscription plans (public)
exports.getPlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ isActive: true })
            .sort({ sortOrder: 1 });

        res.status(200).json({
            success: true,
            data: plans
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get single plan
exports.getPlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        res.status(200).json({
            success: true,
            data: plan
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Create subscription plan (Superadmin)
exports.createPlan = async (req, res) => {
    try {
        const { name, description, price, billingCycle, features, limits, isPopular, sortOrder } = req.body;

        const slug = name.toLowerCase().replace(/\s+/g, '-');

        const plan = await SubscriptionPlan.create({
            name,
            slug,
            description,
            price,
            billingCycle,
            features,
            limits,
            isPopular,
            sortOrder
        });

        res.status(201).json({
            success: true,
            data: plan
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Update subscription plan (Superadmin)
exports.updatePlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByIdAndUpdate(
            req.params.id,
            req.body,
            { returnDocument: 'after', runValidators: true }
        );

        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        res.status(200).json({
            success: true,
            data: plan
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ============= SUBSCRIPTIONS =============

// Get restaurant's current subscription
exports.getMySubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            restaurant: req.user.restaurantId,
            status: { $in: ['ACTIVE', 'PENDING'] }
        }).populate('plan');

        res.status(200).json({
            success: true,
            data: subscription
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all subscriptions (Superadmin)
exports.getAllSubscriptions = async (req, res) => {
    try {
        const { status, restaurantId } = req.query;
        const query = {};

        if (status) query.status = status;
        if (restaurantId) query.restaurant = restaurantId;

        const subscriptions = await Subscription.find(query)
            .populate('restaurant', 'name')
            .populate('plan', 'name price billingCycle')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: subscriptions
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ============= eSEWA PAYMENT =============

// Initialize payment - creates pending subscription and returns eSewa form data
exports.initializePayment = async (req, res) => {
    try {
        const { planId, restaurantId } = req.body;

        // Get plan details
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        // Get restaurant
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }

        // Check if restaurant already has active subscription
        const existingSubscription = await Subscription.findOne({
            restaurant: restaurantId,
            status: 'ACTIVE'
        });

        if (existingSubscription) {
            return res.status(400).json({ 
                success: false, 
                message: 'Restaurant already has an active subscription' 
            });
        }

        // Generate transaction ID
        const transactionId = generateTransactionId();

        // Calculate dates
        const startDate = new Date();
        const endDate = new Date();
        if (plan.billingCycle === 'MONTHLY') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }

        // Create pending subscription
        const subscription = await Subscription.create({
            restaurant: restaurantId,
            plan: planId,
            status: 'PENDING',
            paymentMethod: 'ESEWA',
            startDate,
            endDate,
        });

        // Create pending payment transaction
        const transaction = await PaymentTransaction.create({
            restaurant: restaurantId,
            subscription: subscription._id,
            transactionId,
            amount: plan.price,
            currency: 'NPR',
            status: 'PENDING',
            paymentGateway: 'ESEWA',
            esewaProductCode: ESEWA_CONFIG.merchantId,
            purpose: 'SUBSCRIPTION',
        });

        // Prepare eSewa payment data
        const amount = plan.price;
        const taxAmount = 0;
        const serviceCharge = 0;
        const deliveryCharge = 0;
        const totalAmount = amount + taxAmount + serviceCharge + deliveryCharge;

        // Create signature message: total_amount,transaction_uuid,product_code
        const signatureMessage = `total_amount=${totalAmount},transaction_uuid=${transactionId},product_code=${ESEWA_CONFIG.merchantId}`;
        const signature = generateEsewaSignature(signatureMessage);

        // eSewa form data
        const esewaData = {
            amount: amount.toString(),
            tax_amount: taxAmount.toString(),
            total_amount: totalAmount.toString(),
            transaction_uuid: transactionId,
            product_code: ESEWA_CONFIG.merchantId,
            product_service_charge: serviceCharge.toString(),
            product_delivery_charge: deliveryCharge.toString(),
            success_url: `${ESEWA_CONFIG.successUrl}?subscriptionId=${subscription._id}`,
            failure_url: `${ESEWA_CONFIG.failureUrl}?subscriptionId=${subscription._id}`,
            signed_field_names: 'total_amount,transaction_uuid,product_code',
            signature,
        };

        // Save signature to transaction
        transaction.esewaSignedFieldNames = esewaData.signed_field_names;
        transaction.esewaSignature = signature;
        await transaction.save();

        res.status(200).json({
            success: true,
            data: {
                subscription,
                transaction,
                esewaPaymentUrl: `${ESEWA_CONFIG.baseUrl}/api/epay/main/v2/form`,
                esewaFormData: esewaData,
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Verify eSewa payment callback
exports.verifyPayment = async (req, res) => {
    try {
        const { data } = req.body; // Base64 encoded response from eSewa

        if (!data) {
            return res.status(400).json({ success: false, message: 'No payment data received' });
        }

        // Decode base64 response
        const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
        
        const {
            transaction_uuid,
            status,
            total_amount,
            transaction_code,
            signed_field_names,
            signature: receivedSignature
        } = decodedData;

        // Find the transaction
        const transaction = await PaymentTransaction.findOne({ transactionId: transaction_uuid });
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        // Verify signature
        const signatureMessage = signed_field_names
            .split(',')
            .map(field => `${field}=${decodedData[field]}`)
            .join(',');
        const expectedSignature = generateEsewaSignature(signatureMessage);

        if (receivedSignature !== expectedSignature) {
            // Mark as failed
            transaction.status = 'FAILED';
            transaction.gatewayResponse = decodedData;
            await transaction.save();

            return res.status(400).json({ 
                success: false, 
                message: 'Payment verification failed - invalid signature' 
            });
        }

        if (status !== 'COMPLETE') {
            // Mark as failed
            transaction.status = 'FAILED';
            transaction.gatewayResponse = decodedData;
            await transaction.save();

            // Update subscription status
            await Subscription.findByIdAndUpdate(transaction.subscription, { status: 'CANCELLED' });

            return res.status(400).json({ 
                success: false, 
                message: 'Payment was not completed' 
            });
        }

        // Payment successful - update transaction
        transaction.status = 'COMPLETED';
        transaction.esewaRefId = transaction_code;
        transaction.gatewayResponse = decodedData;
        transaction.completedAt = new Date();
        await transaction.save();

        // Activate subscription
        const subscription = await Subscription.findByIdAndUpdate(
            transaction.subscription,
            { 
                status: 'ACTIVE',
                esewaTransactionId: transaction_uuid,
                esewaRefId: transaction_code,
                amountPaid: total_amount,
                activatedAt: new Date()
            },
            { returnDocument: 'after' }
        ).populate('plan');

        // Activate restaurant
        await Restaurant.findByIdAndUpdate(transaction.restaurant, { status: 'ACTIVE' });

        res.status(200).json({
            success: true,
            message: 'Payment verified and subscription activated',
            data: {
                subscription,
                transaction
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Check payment status (for polling from frontend)
exports.checkPaymentStatus = async (req, res) => {
    try {
        const { subscriptionId } = req.params;

        const subscription = await Subscription.findById(subscriptionId)
            .populate('plan')
            .populate('restaurant', 'name status');

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        const transaction = await PaymentTransaction.findOne({ 
            subscription: subscriptionId 
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                subscription,
                transaction,
                isActive: subscription.status === 'ACTIVE'
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Manual activation by Superadmin
exports.manualActivation = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { notes } = req.body;

        const subscription = await Subscription.findByIdAndUpdate(
            subscriptionId,
            {
                status: 'ACTIVE',
                paymentMethod: 'MANUAL',
                activatedAt: new Date()
            },
            { returnDocument: 'after' }
        ).populate('plan');

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        // Activate restaurant
        await Restaurant.findByIdAndUpdate(subscription.restaurant, { status: 'ACTIVE' });

        // Create manual transaction record
        await PaymentTransaction.create({
            restaurant: subscription.restaurant,
            subscription: subscription._id,
            transactionId: `MANUAL-${Date.now()}`,
            amount: subscription.plan ? subscription.plan.price : 0,
            status: 'COMPLETED',
            paymentGateway: 'MANUAL',
            purpose: 'SUBSCRIPTION',
            gatewayResponse: { notes, activatedBy: req.user._id },
            completedAt: new Date()
        });

        res.status(200).json({
            success: true,
            message: 'Subscription activated manually',
            data: subscription
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
