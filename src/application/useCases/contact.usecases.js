const crypto = require('crypto');
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');

class ContactUseCases {
  constructor({ contactMessageRepository, restaurantRepository, userRepository, notificationService }) {
    this.contactRepo = contactMessageRepository;
    this.restaurantRepo = restaurantRepository;
    this.userRepo = userRepository;
    this.notificationService = notificationService;
  }

  async submitContactForm(data, io) {
    const { fullName, restaurantName, email, phone, message } = data;
    if (!fullName || !restaurantName || !email || !phone || !message) {
      throw new ValidationError('All fields are required');
    }

    const contactMessage = await this.contactRepo.create({ fullName, restaurantName, email, phone, message });

    if (io) {
      await this.notificationService.notifyContactMessage(contactMessage, io);
    }
    return contactMessage;
  }

  async getAllMessages(query = {}) {
    const { page = 1, limit = 50 } = query;
    const filter = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await this.contactRepo.find(filter, { sort: { createdAt: -1 }, limit: parseInt(limit), skip });
    const total = await this.contactRepo.countDocuments(filter);
    return { messages, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) };
  }

  async deleteMessage(id) {
    const message = await this.contactRepo.findById(id);
    if (!message) throw new NotFoundError('Message not found');
    await message.deleteOne();
  }

  async sendInvite(id, customMessage) {
    const contactMessage = await this.contactRepo.findById(id);
    if (!contactMessage) throw new NotFoundError('Contact message not found');
    if (contactMessage.onboardedAt) throw new ValidationError('Restaurant already onboarded');

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const now = new Date();
    const inviteValidityHours = parseInt(process.env.INVITE_EXPIRY_HOURS || '72', 10);
    const inviteExpiresAt = new Date(now.getTime() + inviteValidityHours * 60 * 60 * 1000);

    contactMessage.inviteTokenHash = tokenHash;
    contactMessage.inviteSentAt = now;
    contactMessage.inviteExpiresAt = inviteExpiresAt;
    contactMessage.inviteAcceptedAt = undefined;
    await this.contactRepo.save(contactMessage);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/auth/activate-invite?token=${rawToken}`;

    await this.notificationService.sendOnboardingInviteEmail({
      ownerEmail: contactMessage.email,
      ownerName: contactMessage.fullName,
      restaurantName: contactMessage.restaurantName,
      inviteUrl,
      expiresAt: inviteExpiresAt,
      customMessage: typeof customMessage === 'string' ? customMessage.trim() : undefined,
    });

    return { inviteSentAt: contactMessage.inviteSentAt, inviteExpiresAt: contactMessage.inviteExpiresAt };
  }

  async validateInvite(token) {
    if (!token) throw new ValidationError('Invite token is required');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const contactMessage = await this.contactRepo.findOne({
      inviteTokenHash: tokenHash,
      inviteExpiresAt: { $gt: new Date() },
      inviteAcceptedAt: { $exists: false },
      onboardedAt: { $exists: false },
    });
    if (!contactMessage) throw new ValidationError('Invite is invalid or expired');
    return {
      lead: {
        fullName: contactMessage.fullName,
        email: contactMessage.email,
        restaurantName: contactMessage.restaurantName,
        phone: contactMessage.phone,
      },
      inviteExpiresAt: contactMessage.inviteExpiresAt,
    };
  }

  async activateInvite(data) {
    const { token, password, restaurantAddress, restaurantPhone, cuisineType, numberOfTables } = data;
    if (!token || !password || !restaurantAddress) throw new ValidationError('Token, password and restaurant address are required');
    if (password.length < 6) throw new ValidationError('Password must be at least 6 characters');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const contactMessage = await this.contactRepo.findOne({
      inviteTokenHash: tokenHash,
      inviteExpiresAt: { $gt: new Date() },
      inviteAcceptedAt: { $exists: false },
      onboardedAt: { $exists: false },
    });
    if (!contactMessage) throw new ValidationError('Invite is invalid or expired');

    const existingUser = await this.userRepo.findOne({ email: contactMessage.email });
    if (existingUser) throw new ConflictError('An account already exists for this email');

    const restaurant = await this.restaurantRepo.create({
      name: contactMessage.restaurantName,
      address: restaurantAddress,
      status: 'ACTIVE',
    });

    await this.userRepo.create({
      name: contactMessage.fullName,
      email: contactMessage.email,
      password,
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurant._id,
      mustChangePassword: false,
    });

    contactMessage.restaurantId = restaurant._id;
    contactMessage.onboardedAt = new Date();
    contactMessage.inviteAcceptedAt = new Date();
    contactMessage.inviteTokenHash = undefined;
    contactMessage.inviteExpiresAt = undefined;
    contactMessage.onboardingDetails = {
      restaurantAddress,
      restaurantPhone: restaurantPhone || undefined,
      cuisineType: cuisineType || undefined,
      numberOfTables: numberOfTables ? Number(numberOfTables) : undefined,
    };
    await this.contactRepo.save(contactMessage);
  }
}

module.exports = ContactUseCases;
