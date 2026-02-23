const ContactMessage = require('../models/ContactMessage');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const NotificationService = require('../services/notification.service');
const { ErrorResponse } = require('../middlewares/error.middleware');
const crypto = require('crypto');

// @desc    Submit contact form (Public)
// @route   POST /api/contact
// @access  Public
exports.submitContactForm = async (req, res, next) => {
    try {
        const { fullName, restaurantName, email, phone, message } = req.body;

        // Validation
        if (!fullName || !restaurantName || !email || !phone || !message) {
            return next(new ErrorResponse('All fields are required', 400));
        }

        const contactMessage = await ContactMessage.create({
            fullName,
            restaurantName,
            email,
            phone,
            message,
        });

        // Create notification using the service
        const io = req.app.get('io');
        if (io) {
            console.log('📧 Contact form submitted - Creating notification');
            await NotificationService.notifyContactMessage(contactMessage, io);
        } else {
            console.log('⚠️  Socket.io not available for notification');
        }

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully! We will contact you soon.',
            data: contactMessage,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all contact messages (Superadmin)
// @route   GET /api/contact/messages
// @access  SUPERADMIN
exports.getAllMessages = async (req, res, next) => {
    try {
        const { page = 1, limit = 50 } = req.query;

        const query = {};

        const messages = await ContactMessage.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await ContactMessage.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                messages,
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete message (Superadmin)
// @route   DELETE /api/contact/messages/:id
// @access  SUPERADMIN
exports.deleteMessage = async (req, res, next) => {
    try {
        const message = await ContactMessage.findById(req.params.id);

        if (!message) {
            return next(new ErrorResponse('Message not found', 404));
        }

        await message.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Send onboarding invite from contact message (Superadmin)
// @route   POST /api/contact/messages/:id/send-invite
// @access  SUPERADMIN
exports.sendInvite = async (req, res, next) => {
    try {
        const { customMessage } = req.body || {};
        const contactMessage = await ContactMessage.findById(req.params.id);

        if (!contactMessage) {
            return next(new ErrorResponse('Contact message not found', 404));
        }

        if (contactMessage.onboardedAt) {
            return next(new ErrorResponse('Restaurant already onboarded', 400));
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        const now = new Date();
        const inviteValidityHours = parseInt(process.env.INVITE_EXPIRY_HOURS || '72', 10);
        const inviteExpiresAt = new Date(now.getTime() + inviteValidityHours * 60 * 60 * 1000);

        contactMessage.inviteTokenHash = tokenHash;
        contactMessage.inviteSentAt = now;
        contactMessage.inviteExpiresAt = inviteExpiresAt;
        contactMessage.inviteAcceptedAt = undefined;
        await contactMessage.save();

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const inviteUrl = `${frontendUrl}/auth/activate-invite?token=${rawToken}`;

        await NotificationService.sendOnboardingInviteEmail({
            ownerEmail: contactMessage.email,
            ownerName: contactMessage.fullName,
            restaurantName: contactMessage.restaurantName,
            inviteUrl,
            expiresAt: inviteExpiresAt,
            customMessage: typeof customMessage === 'string' ? customMessage.trim() : undefined,
        });

        res.status(200).json({
            success: true,
            message: 'Invite sent successfully',
            data: {
                inviteSentAt: contactMessage.inviteSentAt,
                inviteExpiresAt: contactMessage.inviteExpiresAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Validate onboarding invite token
// @route   GET /api/contact/invite/validate
// @access  Public
exports.validateInvite = async (req, res, next) => {
    try {
        const { token } = req.query;

        if (!token) {
            return next(new ErrorResponse('Invite token is required', 400));
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const contactMessage = await ContactMessage.findOne({
            inviteTokenHash: tokenHash,
            inviteExpiresAt: { $gt: new Date() },
            inviteAcceptedAt: { $exists: false },
            onboardedAt: { $exists: false },
        }).select('+inviteTokenHash');

        if (!contactMessage) {
            return next(new ErrorResponse('Invite is invalid or expired', 400));
        }

        res.status(200).json({
            success: true,
            data: {
                lead: {
                    fullName: contactMessage.fullName,
                    email: contactMessage.email,
                    restaurantName: contactMessage.restaurantName,
                    phone: contactMessage.phone,
                },
                inviteExpiresAt: contactMessage.inviteExpiresAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Activate invite and complete onboarding
// @route   POST /api/contact/invite/activate
// @access  Public
exports.activateInvite = async (req, res, next) => {
    try {
        const {
            token,
            password,
            restaurantAddress,
            restaurantPhone,
            cuisineType,
            numberOfTables,
        } = req.body;

        if (!token || !password || !restaurantAddress) {
            return next(new ErrorResponse('Token, password and restaurant address are required', 400));
        }

        if (password.length < 6) {
            return next(new ErrorResponse('Password must be at least 6 characters', 400));
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const contactMessage = await ContactMessage.findOne({
            inviteTokenHash: tokenHash,
            inviteExpiresAt: { $gt: new Date() },
            inviteAcceptedAt: { $exists: false },
            onboardedAt: { $exists: false },
        }).select('+inviteTokenHash');

        if (!contactMessage) {
            return next(new ErrorResponse('Invite is invalid or expired', 400));
        }

        const existingUser = await User.findOne({ email: contactMessage.email });
        if (existingUser) {
            return next(new ErrorResponse('An account already exists for this email', 400));
        }

        const restaurant = await Restaurant.create({
            name: contactMessage.restaurantName,
            address: restaurantAddress,
            status: 'ACTIVE',
        });

        await User.create({
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
        await contactMessage.save();

        res.status(200).json({
            success: true,
            message: 'Account activated successfully. You can now log in.',
        });
    } catch (error) {
        next(error);
    }
};
