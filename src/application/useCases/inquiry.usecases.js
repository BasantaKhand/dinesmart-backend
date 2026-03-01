const crypto = require('crypto');
const { NotFoundError, ValidationError } = require('../../shared/errors');

class InquiryUseCases {
  constructor({ restaurantInquiryRepository, restaurantRepository, userRepository, notificationService }) {
    this.inquiryRepo = restaurantInquiryRepository;
    this.restaurantRepo = restaurantRepository;
    this.userRepo = userRepository;
    this.notificationService = notificationService;
  }

  async submitInquiry(data) {
    const inquiry = await this.inquiryRepo.create({ ...data, status: 'PENDING' });
    await this.notificationService.notifyRestaurantInquiry(inquiry);
    return inquiry;
  }

  async getAllInquiries(query = {}) {
    const { status, search } = query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { ownerName: { $regex: search, $options: 'i' } },
        { ownerEmail: { $regex: search, $options: 'i' } },
        { restaurantName: { $regex: search, $options: 'i' } },
      ];
    }
    return this.inquiryRepo.find(filter, {
      sort: { createdAt: -1 },
      populate: [{ path: 'restaurantId', select: 'name _id' }],
    });
  }

  async getInquiry(id) {
    const inquiry = await this.inquiryRepo.findById(id, {
      populate: [{ path: 'restaurantId', select: 'name _id' }],
    });
    if (!inquiry) throw new NotFoundError('Inquiry not found');
    return inquiry;
  }

  async markContacted(id) {
    const inquiry = await this.inquiryRepo.findByIdAndUpdate(id, {
      status: 'CONTACTED',
      contactedAt: new Date(),
    });
    if (!inquiry) throw new NotFoundError('Inquiry not found');
    return inquiry;
  }

  async rejectInquiry(id) {
    const inquiry = await this.inquiryRepo.findByIdAndUpdate(id, { status: 'REJECTED' });
    if (!inquiry) throw new NotFoundError('Inquiry not found');
    return inquiry;
  }

  async onboardRestaurant(inquiryId, planId) {
    const inquiry = await this.inquiryRepo.findById(inquiryId);
    if (!inquiry) throw new NotFoundError('Inquiry not found');
    if (inquiry.status === 'ONBOARDED') throw new ValidationError('Restaurant already onboarded');

    const { tempUsername, tempPassword } = this._generateTempCredentials();
    const paymentToken = crypto.randomBytes(32).toString('hex');

    const restaurant = await this.restaurantRepo.create({
      name: inquiry.restaurantName,
      address: inquiry.restaurantAddress,
      status: 'PENDING',
    });

    await this.userRepo.create({
      name: inquiry.ownerName,
      email: inquiry.ownerEmail,
      password: tempPassword,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurant._id,
      mustChangePassword: true,
    });

    const updatedInquiry = await this.inquiryRepo.findByIdAndUpdate(inquiryId, {
      status: 'ONBOARDED',
      restaurantId: restaurant._id,
      tempUsername: inquiry.ownerEmail,
      tempPassword,
      onboardedAt: new Date(),
      selectedPlanId: planId || null,
      paymentToken,
    });

    try {
      await this.notificationService.sendOnboardingCredentialsEmail({
        ownerEmail: inquiry.ownerEmail,
        ownerName: inquiry.ownerName,
        restaurantName: inquiry.restaurantName,
        username: inquiry.ownerEmail,
        password: tempPassword,
        paymentToken,
        restaurantId: restaurant._id,
        planId,
      });
      updatedInquiry.credentialsSentAt = new Date();
      await this.inquiryRepo.save(updatedInquiry);
    } catch (emailError) {
      return { inquiry: updatedInquiry, paymentToken, restaurantId: restaurant._id, emailError: emailError.message };
    }

    return { inquiry: updatedInquiry, paymentToken, restaurantId: restaurant._id };
  }

  async resendCredentialsEmail(id) {
    const inquiry = await this.inquiryRepo.findById(id, { select: '+tempPassword' });
    if (!inquiry) throw new NotFoundError('Inquiry not found');
    if (inquiry.status !== 'ONBOARDED' || !inquiry.tempPassword) {
      throw new ValidationError('Credentials not available for this inquiry. Please onboard first.');
    }

    await this.notificationService.sendOnboardingCredentialsEmail({
      ownerEmail: inquiry.ownerEmail,
      ownerName: inquiry.ownerName,
      restaurantName: inquiry.restaurantName,
      username: inquiry.ownerEmail,
      password: inquiry.tempPassword,
    });

    inquiry.credentialsSentAt = new Date();
    await this.inquiryRepo.save(inquiry);
  }

  _generateTempCredentials() {
    const timestamp = Date.now();
    return {
      tempUsername: `rest_${timestamp}`,
      tempPassword: Math.random().toString(36).substring(2, 14),
    };
  }
}

module.exports = InquiryUseCases;
