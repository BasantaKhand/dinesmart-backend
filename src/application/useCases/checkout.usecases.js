const crypto = require('crypto');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const envConfig = require('../../config/env');

const ESEWA_CONFIG = envConfig.esewa;

const generateEsewaSignature = (message) => {
  const hmac = crypto.createHmac('sha256', ESEWA_CONFIG.secretKey);
  hmac.update(message);
  return hmac.digest('base64');
};

const generateTransactionId = () => `CHK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
const generateActivationToken = () => crypto.randomBytes(32).toString('hex');

class CheckoutUseCases {
  constructor({
    checkoutSessionRepository,
    subscriptionPlanRepository,
    restaurantRepository,
    userRepository,
    subscriptionRepository,
    notificationService,
  }) {
    this.sessionRepo = checkoutSessionRepository;
    this.planRepo = subscriptionPlanRepository;
    this.restaurantRepo = restaurantRepository;
    this.userRepo = userRepository;
    this.subscriptionRepo = subscriptionRepository;
    this.notificationService = notificationService;
  }

  /* ====== PUBLIC ENDPOINTS ====== */

  async createCheckoutSession({ email, phone, planId }) {
    if (!email || !phone || !planId) throw new ValidationError('Email, phone and plan selection are required');

    const existingPending = await this.sessionRepo.findOne({
      email: email.toLowerCase(),
      status: { $in: ['PAYMENT_PENDING', 'VERIFIED'] },
    });

    if (existingPending) {
      if (existingPending.status === 'VERIFIED') {
        throw new ValidationError('You already have a verified payment pending activation. Please check your email for the activation link.');
      }
      await this.sessionRepo.findByIdAndDelete(existingPending._id);
    }

    const existingUser = await this.userRepo.findOne({ email: email.toLowerCase() });
    if (existingUser) throw new ValidationError('This email is already registered. Please login instead.');

    const plan = await this.planRepo.findById(planId);
    if (!plan || !plan.isActive) throw new NotFoundError('Selected plan not found or not available');

    const transactionId = generateTransactionId();
    const session = await this.sessionRepo.create({
      email: email.toLowerCase(),
      phone,
      plan: planId,
      amount: plan.price,
      currency: 'NPR',
      transactionId,
      status: 'PAYMENT_PENDING',
    });

    const amount = plan.price;
    const totalAmount = amount;
    const signatureMessage = `total_amount=${totalAmount},transaction_uuid=${transactionId},product_code=${ESEWA_CONFIG.merchantId}`;
    const signature = generateEsewaSignature(signatureMessage);

    const esewaData = {
      amount: amount.toString(),
      tax_amount: '0',
      total_amount: totalAmount.toString(),
      transaction_uuid: transactionId,
      product_code: ESEWA_CONFIG.merchantId,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: `${ESEWA_CONFIG.successUrl}?sessionId=${session._id}`,
      failure_url: `${ESEWA_CONFIG.failureUrl}?sessionId=${session._id}`,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    };

    session.esewaSignature = signature;
    await this.sessionRepo.save(session);

    return {
      sessionId: session._id,
      plan: { name: plan.name, price: plan.price, billingCycle: plan.billingCycle },
      esewaPaymentUrl: `${ESEWA_CONFIG.baseUrl}/api/epay/main/v2/form`,
      esewaFormData: esewaData,
    };
  }

  async verifyPayment(base64Data, io) {
    if (!base64Data) throw new ValidationError('No payment data received');

    let decodedData;
    try {
      decodedData = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf-8'));
    } catch {
      throw new ValidationError('Invalid payment data format');
    }

    const { transaction_uuid, status, transaction_code, signed_field_names, signature: receivedSignature } = decodedData;
    const session = await this.sessionRepo.findOne({ transactionId: transaction_uuid });
    if (!session) throw new NotFoundError('Checkout session not found');

    const signatureMessage = signed_field_names.split(',').map((field) => `${field}=${decodedData[field]}`).join(',');
    const expectedSignature = generateEsewaSignature(signatureMessage);

    if (receivedSignature !== expectedSignature) {
      const isDev = process.env.NODE_ENV !== 'production';
      if (!(isDev && status === 'COMPLETE')) {
        session.status = 'FAILED';
        session.gatewayResponse = decodedData;
        await this.sessionRepo.save(session);
        throw new ValidationError('Payment verification failed - invalid signature');
      }
    }

    if (status !== 'COMPLETE') {
      session.status = 'FAILED';
      session.gatewayResponse = decodedData;
      await this.sessionRepo.save(session);
      throw new ValidationError('Payment was not completed');
    }

    session.status = 'VERIFIED';
    session.esewaRefId = transaction_code;
    session.gatewayResponse = decodedData;
    session.verifiedAt = new Date();
    await this.sessionRepo.save(session);

    try { await this.notificationService.notifyNewVerifiedPayment(session, io); } catch (_) { /* non-critical */ }

    return { sessionId: session._id, status: 'VERIFIED' };
  }

  async getSessionStatus(sessionId) {
    const session = await this.sessionRepo.findById(sessionId, {
      populate: [{ path: 'plan', select: 'name price billingCycle' }],
    });
    if (!session) throw new NotFoundError('Session not found');
    return { status: session.status, email: session.email, plan: session.plan, verifiedAt: session.verifiedAt, activatedAt: session.activatedAt };
  }

  /* ====== SUPERADMIN ENDPOINTS ====== */

  async getAllSessions(query = {}) {
    const { status, search } = query;
    const filter = {};
    if (status && status !== 'ALL') filter.status = status;
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } },
      ];
    }
    return this.sessionRepo.find(filter, {
      populate: [{ path: 'plan', select: 'name price billingCycle' }],
      sort: { createdAt: -1 },
    });
  }

  async getPendingActivations() {
    return this.sessionRepo.find(
      { status: 'VERIFIED' },
      { populate: [{ path: 'plan', select: 'name price billingCycle' }], sort: { verifiedAt: -1 } }
    );
  }

  async activateAndSendInvite(sessionId) {
    const session = await this.sessionRepo.findById(sessionId, {
      populate: [{ path: 'plan' }],
    });
    if (!session) throw new NotFoundError('Session not found');
    if (session.status !== 'VERIFIED') throw new ValidationError(`Cannot activate session with status: ${session.status}`);
    if (session.activationToken && !session.isExpired) {
      throw new ValidationError('Activation invite already sent. Resend from the resend option if needed.');
    }

    const activationToken = generateActivationToken();
    const activationTokenExpiry = new Date();
    activationTokenExpiry.setDate(activationTokenExpiry.getDate() + 7);

    session.activationToken = activationToken;
    session.activationTokenExpiry = activationTokenExpiry;
    session.inviteSentAt = new Date();
    await this.sessionRepo.save(session);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const activationLink = `${frontendUrl}/auth/activate?token=${activationToken}`;

    let emailError = null;
    try {
      await this.notificationService.sendActivationInviteEmail({
        email: session.email,
        planName: session.plan.name,
        activationLink,
        expiresIn: '7 days',
      });
    } catch (err) {
      console.error('Email send failed (non-critical):', err.message);
      emailError = err.message;
    }

    return {
      sessionId: session._id,
      email: session.email,
      inviteSentAt: session.inviteSentAt,
      activationLink,
      ...(emailError && { emailError }),
    };
  }

  async resendInvite(sessionId) {
    const session = await this.sessionRepo.findById(sessionId, { populate: [{ path: 'plan' }] });
    if (!session) throw new NotFoundError('Session not found');
    if (session.status === 'ACTIVATED') throw new ValidationError('This account is already activated');

    const activationToken = generateActivationToken();
    const activationTokenExpiry = new Date();
    activationTokenExpiry.setDate(activationTokenExpiry.getDate() + 7);

    session.activationToken = activationToken;
    session.activationTokenExpiry = activationTokenExpiry;
    session.inviteSentAt = new Date();
    await this.sessionRepo.save(session);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const activationLink = `${frontendUrl}/auth/activate?token=${activationToken}`;

    let emailError = null;
    try {
      await this.notificationService.sendActivationInviteEmail({
        email: session.email,
        planName: session.plan.name,
        activationLink,
        expiresIn: '7 days',
      });
    } catch (err) {
      console.error('Resend email failed (non-critical):', err.message);
      emailError = err.message;
    }

    return { activationLink, ...(emailError && { emailError }) };
  }

  /* ====== OWNER ACTIVATION ENDPOINTS ====== */

  async validateActivationToken(token) {
    const session = await this.sessionRepo.findOne({ activationToken: token }, {
      populate: [{ path: 'plan', select: 'name price billingCycle features' }],
    });
    if (!session) throw new NotFoundError('Invalid or expired activation link');
    if (session.status === 'ACTIVATED') throw new ValidationError('This account has already been activated. Please login.');
    if (new Date() > session.activationTokenExpiry) throw new ValidationError('Activation link has expired. Please contact support.');
    return { email: session.email, phone: session.phone, plan: session.plan };
  }

  async completeActivation(token, data) {
    const { password, ownerName, restaurantName, restaurantAddress } = data;
    if (!password || !ownerName || !restaurantName || !restaurantAddress) {
      throw new ValidationError('All fields are required: password, ownerName, restaurantName, restaurantAddress');
    }
    if (password.length < 6) throw new ValidationError('Password must be at least 6 characters');

    const session = await this.sessionRepo.findOne({ activationToken: token }, { populate: [{ path: 'plan' }] });
    if (!session) throw new NotFoundError('Invalid or expired activation link');
    if (session.status === 'ACTIVATED') throw new ValidationError('This account has already been activated');
    if (new Date() > session.activationTokenExpiry) throw new ValidationError('Activation link has expired');

    const restaurant = await this.restaurantRepo.create({
      name: restaurantName,
      address: restaurantAddress,
      phone: session.phone,
      status: 'ACTIVE',
    });

    const user = await this.userRepo.create({
      name: ownerName,
      email: session.email,
      password,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurant._id,
      mustChangePassword: false,
    });

    const startDate = new Date();
    const endDate = new Date();
    if (session.plan.billingCycle === 'MONTHLY') endDate.setMonth(endDate.getMonth() + 1);
    else endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await this.subscriptionRepo.create({
      restaurant: restaurant._id,
      plan: session.plan._id,
      status: 'ACTIVE',
      paymentMethod: 'ESEWA',
      startDate,
      endDate,
      esewaTransactionId: session.transactionId,
      esewaRefId: session.esewaRefId,
      amountPaid: session.amount,
      activatedAt: new Date(),
    });

    session.status = 'ACTIVATED';
    session.restaurantId = restaurant._id;
    session.userId = user._id;
    session.subscriptionId = subscription._id;
    session.completedAt = new Date();
    session.activationToken = undefined;
    session.activationTokenExpiry = undefined;
    await this.sessionRepo.save(session);

    return { email: session.email, restaurantName: restaurant.name };
  }
}

module.exports = CheckoutUseCases;
