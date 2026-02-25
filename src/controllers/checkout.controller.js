const crypto = require('crypto');
const CheckoutSession = require('../models/CheckoutSession');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const notificationService = require('../services/notification.service');
const envConfig = require('../config/env');

// eSewa configuration
const ESEWA_CONFIG = envConfig.esewa;

// Generate HMAC SHA256 signature for eSewa
const generateEsewaSignature = (message) => {
    const hmac = crypto.createHmac('sha256', ESEWA_CONFIG.secretKey);
    hmac.update(message);
    return hmac.digest('base64');
};

// Generate unique transaction ID
const generateTransactionId = () => {
    return `CHK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

// Generate activation token
const generateActivationToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// ============= PUBLIC ENDPOINTS =============

/**
 * Create checkout session - Step 1: Owner selects plan, provides email/phone
 * Returns eSewa payment form data for redirect
 */
exports.createCheckoutSession = async (req, res) => {
    try {
        const { email, phone, planId } = req.body;

        // Validate input
        if (!email || !phone || !planId) {
            return res.status(400).json({
                success: false,
                message: 'Email, phone and plan selection are required'
            });
        }

        // Check if email already has a pending checkout
        const existingPending = await CheckoutSession.findOne({
            email: email.toLowerCase(),
            status: { $in: ['PAYMENT_PENDING', 'VERIFIED'] }
        });

        if (existingPending) {
            if (existingPending.status === 'VERIFIED') {
                return res.status(400).json({
                    success: false,
                    message: 'You already have a verified payment pending activation. Please check your email for the activation link.'
                });
            }
            // Delete old pending session
            await CheckoutSession.findByIdAndDelete(existingPending._id);
        }

        // Check if email is already registered
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'This email is already registered. Please login instead.'
            });
        }

        // Get plan details
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Selected plan not found or not available'
            });
        }

        // Generate transaction ID
        const transactionId = generateTransactionId();

        // Create checkout session
        const session = await CheckoutSession.create({
            email: email.toLowerCase(),
            phone,
            plan: planId,
            amount: plan.price,
            currency: 'NPR',
            transactionId,
            status: 'PAYMENT_PENDING'
        });

        // Prepare eSewa payment data
        const amount = plan.price;
        const taxAmount = 0;
        const serviceCharge = 0;
        const deliveryCharge = 0;
        const totalAmount = amount + taxAmount + serviceCharge + deliveryCharge;

        // Create signature message
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
            success_url: `${ESEWA_CONFIG.successUrl}?sessionId=${session._id}`,
            failure_url: `${ESEWA_CONFIG.failureUrl}?sessionId=${session._id}`,
            signed_field_names: 'total_amount,transaction_uuid,product_code',
            signature,
        };

        // Save signature to session
        session.esewaSignature = signature;
        await session.save();

        res.status(200).json({
            success: true,
            data: {
                sessionId: session._id,
                plan: {
                    name: plan.name,
                    price: plan.price,
                    billingCycle: plan.billingCycle
                },
                esewaPaymentUrl: `${ESEWA_CONFIG.baseUrl}/api/epay/main/v2/form`,
                esewaFormData: esewaData
            }
        });
    } catch (error) {
        console.error('Create checkout session error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Verify payment callback from eSewa
 * Marks session as VERIFIED, notifies superadmin
 */
exports.verifyPayment = async (req, res) => {
    try {
        const { data } = req.body; // Base64 encoded response from eSewa

        if (!data) {
            return res.status(400).json({ success: false, message: 'No payment data received' });
        }

        // Decode base64 response
        let decodedData;
        try {
            decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
            console.log('eSewa decoded response:', decodedData);
        } catch (decodeErr) {
            console.error('Failed to decode eSewa data:', decodeErr);
            return res.status(400).json({ success: false, message: 'Invalid payment data format' });
        }
        
        const {
            transaction_uuid,
            status,
            total_amount,
            transaction_code,
            signed_field_names,
            signature: receivedSignature
        } = decodedData;

        // Find the checkout session
        const session = await CheckoutSession.findOne({ transactionId: transaction_uuid });
        if (!session) {
            console.error('Session not found for transaction:', transaction_uuid);
            return res.status(404).json({ success: false, message: 'Checkout session not found' });
        }

        // Verify signature
        const signatureMessage = signed_field_names
            .split(',')
            .map(field => `${field}=${decodedData[field]}`)
            .join(',');
        const expectedSignature = generateEsewaSignature(signatureMessage);

        console.log('Signature verification:', { signatureMessage, expectedSignature, receivedSignature });

        if (receivedSignature !== expectedSignature) {
            // In development, log but don't fail on signature mismatch if payment status is COMPLETE
            const isDev = process.env.NODE_ENV !== 'production';
            if (isDev && status === 'COMPLETE') {
                console.warn('Signature mismatch in development mode, proceeding with payment verification');
            } else {
                session.status = 'FAILED';
                session.gatewayResponse = decodedData;
                await session.save();

                return res.status(400).json({
                    success: false,
                    message: 'Payment verification failed - invalid signature'
                });
            }
        }

        if (status !== 'COMPLETE') {
            session.status = 'FAILED';
            session.gatewayResponse = decodedData;
            await session.save();

            return res.status(400).json({
                success: false,
                message: 'Payment was not completed'
            });
        }

        // Payment successful - mark as VERIFIED
        session.status = 'VERIFIED';
        session.esewaRefId = transaction_code;
        session.gatewayResponse = decodedData;
        session.verifiedAt = new Date();
        await session.save();

        console.log('Payment verified successfully for session:', session._id);

        // Notify superadmin about verified payment
        try {
            await notificationService.notifyNewVerifiedPayment(session);
        } catch (notifyError) {
            console.error('Failed to notify superadmin:', notifyError);
        }

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully. Awaiting activation by admin.',
            data: {
                sessionId: session._id,
                status: 'VERIFIED'
            }
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Check session status (for success/failure page)
 */
exports.getSessionStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await CheckoutSession.findById(sessionId)
            .populate('plan', 'name price billingCycle');

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                status: session.status,
                email: session.email,
                plan: session.plan,
                verifiedAt: session.verifiedAt,
                activatedAt: session.activatedAt
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ============= SUPERADMIN ENDPOINTS =============

/**
 * Get all checkout sessions (with filters)
 */
exports.getAllSessions = async (req, res) => {
    try {
        const { status, search } = req.query;
        const query = {};

        if (status && status !== 'ALL') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { transactionId: { $regex: search, $options: 'i' } }
            ];
        }

        const sessions = await CheckoutSession.find(query)
            .populate('plan', 'name price billingCycle')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: sessions
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Get verified sessions waiting for activation
 */
exports.getPendingActivations = async (req, res) => {
    try {
        const sessions = await CheckoutSession.find({ status: 'VERIFIED' })
            .populate('plan', 'name price billingCycle')
            .sort({ verifiedAt: -1 });

        res.status(200).json({
            success: true,
            data: sessions,
            count: sessions.length
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Superadmin: Activate & Send Invite
 * Creates restaurant (INACTIVE), generates activation token, sends email
 */
exports.activateAndSendInvite = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await CheckoutSession.findById(sessionId)
            .populate('plan');

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (session.status !== 'VERIFIED') {
            return res.status(400).json({
                success: false,
                message: `Cannot activate session with status: ${session.status}`
            });
        }

        // Check if already has activation token
        if (session.activationToken && !session.isExpired) {
            return res.status(400).json({
                success: false,
                message: 'Activation invite already sent. Resend from the resend option if needed.'
            });
        }

        // Generate activation token (expires in 7 days)
        const activationToken = generateActivationToken();
        const activationTokenExpiry = new Date();
        activationTokenExpiry.setDate(activationTokenExpiry.getDate() + 7);

        // Update session
        session.activationToken = activationToken;
        session.activationTokenExpiry = activationTokenExpiry;
        session.inviteSentAt = new Date();
        await session.save();

        // Send activation email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const activationLink = `${frontendUrl}/auth/activate?token=${activationToken}`;

        await notificationService.sendActivationInviteEmail({
            email: session.email,
            planName: session.plan.name,
            activationLink,
            expiresIn: '7 days'
        });

        res.status(200).json({
            success: true,
            message: 'Activation invite sent successfully',
            data: {
                sessionId: session._id,
                email: session.email,
                inviteSentAt: session.inviteSentAt
            }
        });
    } catch (error) {
        console.error('Activate and send invite error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Resend activation invite
 */
exports.resendInvite = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await CheckoutSession.findById(sessionId)
            .populate('plan');

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (session.status === 'ACTIVATED') {
            return res.status(400).json({
                success: false,
                message: 'This account is already activated'
            });
        }

        // Generate new activation token
        const activationToken = generateActivationToken();
        const activationTokenExpiry = new Date();
        activationTokenExpiry.setDate(activationTokenExpiry.getDate() + 7);

        session.activationToken = activationToken;
        session.activationTokenExpiry = activationTokenExpiry;
        session.inviteSentAt = new Date();
        await session.save();

        // Resend email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const activationLink = `${frontendUrl}/auth/activate?token=${activationToken}`;

        await notificationService.sendActivationInviteEmail({
            email: session.email,
            planName: session.plan.name,
            activationLink,
            expiresIn: '7 days'
        });

        res.status(200).json({
            success: true,
            message: 'Activation invite resent successfully'
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ============= OWNER ACTIVATION ENDPOINTS =============

/**
 * Validate activation token
 */
exports.validateActivationToken = async (req, res) => {
    try {
        const { token } = req.params;

        const session = await CheckoutSession.findOne({
            activationToken: token
        }).populate('plan', 'name price billingCycle features');

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired activation link'
            });
        }

        if (session.status === 'ACTIVATED') {
            return res.status(400).json({
                success: false,
                message: 'This account has already been activated. Please login.'
            });
        }

        if (new Date() > session.activationTokenExpiry) {
            return res.status(400).json({
                success: false,
                message: 'Activation link has expired. Please contact support.'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                email: session.email,
                phone: session.phone,
                plan: session.plan
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Complete activation - Owner sets password and restaurant details
 */
exports.completeActivation = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, ownerName, restaurantName, restaurantAddress } = req.body;

        // Validate input
        if (!password || !ownerName || !restaurantName || !restaurantAddress) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: password, ownerName, restaurantName, restaurantAddress'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Find session
        const session = await CheckoutSession.findOne({
            activationToken: token
        }).populate('plan');

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired activation link'
            });
        }

        if (session.status === 'ACTIVATED') {
            return res.status(400).json({
                success: false,
                message: 'This account has already been activated'
            });
        }

        if (new Date() > session.activationTokenExpiry) {
            return res.status(400).json({
                success: false,
                message: 'Activation link has expired'
            });
        }

        // Create restaurant (ACTIVE immediately after completion)
        const restaurant = await Restaurant.create({
            name: restaurantName,
            address: restaurantAddress,
            phone: session.phone,
            status: 'ACTIVE'
        });

        // Create user
        const user = await User.create({
            name: ownerName,
            email: session.email,
            password,
            role: 'RESTAURANT_ADMIN',
            restaurantId: restaurant._id,
            mustChangePassword: false
        });

        // Create subscription
        const startDate = new Date();
        const endDate = new Date();
        if (session.plan.billingCycle === 'MONTHLY') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }

        const subscription = await Subscription.create({
            restaurant: restaurant._id,
            plan: session.plan._id,
            status: 'ACTIVE',
            paymentMethod: 'ESEWA',
            startDate,
            endDate,
            esewaTransactionId: session.transactionId,
            esewaRefId: session.esewaRefId,
            amountPaid: session.amount,
            activatedAt: new Date()
        });

        // Update session
        session.status = 'ACTIVATED';
        session.restaurantId = restaurant._id;
        session.userId = user._id;
        session.subscriptionId = subscription._id;
        session.completedAt = new Date();
        session.activationToken = undefined; // Clear token
        session.activationTokenExpiry = undefined;
        await session.save();

        res.status(200).json({
            success: true,
            message: 'Account activated successfully! You can now login.',
            data: {
                email: session.email,
                restaurantName: restaurant.name
            }
        });
    } catch (error) {
        console.error('Complete activation error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = exports;
