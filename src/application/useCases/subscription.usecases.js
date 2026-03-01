const crypto = require('crypto');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const envConfig = require('../../config/env');

const ESEWA_CONFIG = envConfig.esewa;

const generateEsewaSignature = (message) => {
  const hmac = crypto.createHmac('sha256', ESEWA_CONFIG.secretKey);
  hmac.update(message);
  return hmac.digest('base64');
};

const generateTransactionId = () =>
  `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

class SubscriptionUseCases {
  constructor({
    subscriptionPlanRepository,
    subscriptionRepository,
    paymentTransactionRepository,
    restaurantRepository,
  }) {
    this.planRepo = subscriptionPlanRepository;
    this.subRepo = subscriptionRepository;
    this.txRepo = paymentTransactionRepository;
    this.restaurantRepo = restaurantRepository;
  }

  /* ====== PLANS ====== */

  async getPlans() {
    return this.planRepo.find({ isActive: true }, { sort: { sortOrder: 1 } });
  }

  async getPlan(id) {
    const plan = await this.planRepo.findById(id);
    if (!plan) throw new NotFoundError('Plan not found');
    return plan;
  }

  async createPlan(data) {
    const { name, description, price, billingCycle, features, limits, isPopular, sortOrder } = data;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return this.planRepo.create({ name, slug, description, price, billingCycle, features, limits, isPopular, sortOrder });
  }

  async updatePlan(id, data) {
    const plan = await this.planRepo.findByIdAndUpdate(id, data);
    if (!plan) throw new NotFoundError('Plan not found');
    return plan;
  }

  /* ====== SUBSCRIPTIONS ====== */

  async getMySubscription(restaurantId) {
    return this.subRepo.findOne(
      { restaurant: restaurantId, status: { $in: ['ACTIVE', 'PENDING'] } },
      { populate: [{ path: 'plan' }] }
    );
  }

  async getAllSubscriptions(query = {}) {
    const { status, restaurantId } = query;
    const filter = {};
    if (status) filter.status = status;
    if (restaurantId) filter.restaurant = restaurantId;
    return this.subRepo.find(filter, {
      populate: [
        { path: 'restaurant', select: 'name' },
        { path: 'plan', select: 'name price billingCycle' },
      ],
      sort: { createdAt: -1 },
    });
  }

  /* ====== eSEWA PAYMENT ====== */

  async initializePayment({ planId, restaurantId }) {
    const plan = await this.planRepo.findById(planId);
    if (!plan) throw new NotFoundError('Plan not found');

    const restaurant = await this.restaurantRepo.findById(restaurantId);
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    const existingSub = await this.subRepo.findOne({ restaurant: restaurantId, status: 'ACTIVE' });
    if (existingSub) throw new ValidationError('Restaurant already has an active subscription');

    const transactionId = generateTransactionId();
    const startDate = new Date();
    const endDate = new Date();
    if (plan.billingCycle === 'MONTHLY') endDate.setMonth(endDate.getMonth() + 1);
    else endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await this.subRepo.create({
      restaurant: restaurantId,
      plan: planId,
      status: 'PENDING',
      paymentMethod: 'ESEWA',
      startDate,
      endDate,
    });

    const transaction = await this.txRepo.create({
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

    const totalAmount = plan.price;
    const signatureMessage = `total_amount=${totalAmount},transaction_uuid=${transactionId},product_code=${ESEWA_CONFIG.merchantId}`;
    const signature = generateEsewaSignature(signatureMessage);

    const esewaData = {
      amount: plan.price.toString(),
      tax_amount: '0',
      total_amount: totalAmount.toString(),
      transaction_uuid: transactionId,
      product_code: ESEWA_CONFIG.merchantId,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: `${ESEWA_CONFIG.successUrl}?subscriptionId=${subscription._id}`,
      failure_url: `${ESEWA_CONFIG.failureUrl}?subscriptionId=${subscription._id}`,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    };

    transaction.esewaSignedFieldNames = esewaData.signed_field_names;
    transaction.esewaSignature = signature;
    await this.txRepo.save(transaction);

    return {
      subscription,
      transaction,
      esewaPaymentUrl: `${ESEWA_CONFIG.baseUrl}/api/epay/main/v2/form`,
      esewaFormData: esewaData,
    };
  }

  async verifyPayment(base64Data) {
    if (!base64Data) throw new ValidationError('No payment data received');
    const decodedData = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf-8'));

    const { transaction_uuid, status, total_amount, transaction_code, signed_field_names, signature: receivedSignature } = decodedData;

    const transaction = await this.txRepo.findOne({ transactionId: transaction_uuid });
    if (!transaction) throw new NotFoundError('Transaction not found');

    const signatureMessage = signed_field_names.split(',').map((f) => `${f}=${decodedData[f]}`).join(',');
    const expectedSignature = generateEsewaSignature(signatureMessage);

    if (receivedSignature !== expectedSignature) {
      transaction.status = 'FAILED';
      transaction.gatewayResponse = decodedData;
      await this.txRepo.save(transaction);
      throw new ValidationError('Payment verification failed - invalid signature');
    }

    if (status !== 'COMPLETE') {
      transaction.status = 'FAILED';
      transaction.gatewayResponse = decodedData;
      await this.txRepo.save(transaction);
      await this.subRepo.findByIdAndUpdate(transaction.subscription, { status: 'CANCELLED' });
      throw new ValidationError('Payment was not completed');
    }

    transaction.status = 'COMPLETED';
    transaction.esewaRefId = transaction_code;
    transaction.gatewayResponse = decodedData;
    transaction.completedAt = new Date();
    await this.txRepo.save(transaction);

    const subscription = await this.subRepo.findByIdAndUpdate(transaction.subscription, {
      status: 'ACTIVE',
      esewaTransactionId: transaction_uuid,
      esewaRefId: transaction_code,
      amountPaid: total_amount,
      activatedAt: new Date(),
    });

    await this.restaurantRepo.findByIdAndUpdate(transaction.restaurant, { status: 'ACTIVE' });

    return { subscription, transaction };
  }

  async checkPaymentStatus(subscriptionId) {
    const subscription = await this.subRepo.findById(subscriptionId, {
      populate: [{ path: 'plan' }, { path: 'restaurant', select: 'name status' }],
    });
    if (!subscription) throw new NotFoundError('Subscription not found');
    const transaction = await this.txRepo.findOne({ subscription: subscriptionId }, { sort: { createdAt: -1 } });
    return { subscription, transaction, isActive: subscription.status === 'ACTIVE' };
  }

  async manualActivation(subscriptionId, userId, notes) {
    const subscription = await this.subRepo.findByIdAndUpdate(subscriptionId, {
      status: 'ACTIVE',
      paymentMethod: 'MANUAL',
      activatedAt: new Date(),
    });
    if (!subscription) throw new NotFoundError('Subscription not found');

    await this.restaurantRepo.findByIdAndUpdate(subscription.restaurant, { status: 'ACTIVE' });

    await this.txRepo.create({
      restaurant: subscription.restaurant,
      subscription: subscription._id,
      transactionId: `MANUAL-${Date.now()}`,
      amount: subscription.plan ? subscription.plan.price : 0,
      status: 'COMPLETED',
      paymentGateway: 'MANUAL',
      purpose: 'SUBSCRIPTION',
      gatewayResponse: { notes, activatedBy: userId },
      completedAt: new Date(),
    });

    return subscription;
  }
}

module.exports = SubscriptionUseCases;
