const { AuthenticationError, NotFoundError, ValidationError, AuthorizationError } = require('../../shared/errors');
const { generateToken } = require('../../shared/utils/jwt');
const crypto = require('crypto');

class AuthUseCases {
  constructor({ userRepository, restaurantRepository, activityLogRepository, notificationService }) {
    this.userRepo = userRepository;
    this.restaurantRepo = restaurantRepository;
    this.activityLogRepo = activityLogRepository;
    this.notificationService = notificationService;
  }

  async login({ email, password, ipAddress, userAgent }) {
    if (!email || !password) {
      throw new ValidationError('Please provide an email and password');
    }

    const users = await this.userRepo.findByEmail(email);

    if (users.length === 0) {
      await this.activityLogRepo.log({
        type: 'LOGIN_FAILED', severity: 'WARNING',
        message: `Failed login attempt for email: ${email} (user not found)`,
        userEmail: email, ipAddress, userAgent,
      });
      throw new AuthenticationError('Invalid credentials');
    }

    let matchedUser = null;
    for (const user of users) {
      const isMatch = await user.comparePassword(password);
      if (isMatch) { matchedUser = user; break; }
    }

    if (!matchedUser) {
      await this.activityLogRepo.log({
        type: 'LOGIN_FAILED', severity: 'WARNING',
        message: `Failed login attempt for email: ${email} (invalid password)`,
        userEmail: email, ipAddress, userAgent,
      });
      throw new AuthenticationError('Invalid credentials');
    }

    if (matchedUser.status === 'INACTIVE') {
      await this.activityLogRepo.log({
        type: 'LOGIN_FAILED', severity: 'WARNING',
        message: `Login attempt for deactivated account: ${email}`,
        userId: matchedUser._id, userEmail: email, userName: matchedUser.name,
        userRole: matchedUser.role, ipAddress, userAgent,
      });
      throw new AuthorizationError('Your account has been deactivated. Please contact your administrator.');
    }

    let restaurantName = null;
    if (matchedUser.role !== 'SUPERADMIN') {
      const restaurant = await this.restaurantRepo.findById(matchedUser.restaurantId);
      if (!restaurant) throw new NotFoundError('Restaurant not found');
      restaurantName = restaurant.name;
      if (restaurant.status === 'PENDING') {
        throw new AuthorizationError('Your restaurant account is pending activation. Please check your email for the activation link.');
      }
      if (restaurant.status === 'SUSPENDED') {
        throw new AuthorizationError('Your restaurant has been suspended. Please contact support.');
      }
    }

    const token = generateToken({ id: matchedUser._id });

    await this.activityLogRepo.log({
      type: 'USER_LOGIN', severity: 'INFO',
      message: `${matchedUser.name || matchedUser.email} logged in successfully`,
      userId: matchedUser._id, userEmail: matchedUser.email, userName: matchedUser.name,
      userRole: matchedUser.role, restaurantId: matchedUser.restaurantId,
      restaurantName, ipAddress, userAgent,
    });

    return {
      user: {
        id: matchedUser._id, name: matchedUser.name, email: matchedUser.email,
        role: matchedUser.role, restaurantId: matchedUser.restaurantId,
        mustChangePassword: matchedUser.mustChangePassword,
      },
      token,
    };
  }

  async logout({ user, ipAddress, userAgent }) {
    if (user) {
      await this.activityLogRepo.log({
        type: 'USER_LOGOUT', severity: 'INFO',
        message: `${user.name || user.email} logged out`,
        userId: user._id, userEmail: user.email, userName: user.name,
        userRole: user.role, restaurantId: user.restaurantId, ipAddress, userAgent,
      });
    }
  }

  async getMe(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return {
      user: {
        id: user._id, name: user.name, email: user.email, phone: user.phone,
        role: user.role, restaurantId: user.restaurantId,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async updateProfile({ userId, name, email, phone, currentPassword, newPassword, ipAddress, userAgent }) {
    const user = await this.userRepo.findById(userId, true);
    if (!user) throw new NotFoundError('User not found');

    if (newPassword) {
      if (!currentPassword) throw new ValidationError('Current password is required to set a new password');
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) throw new AuthenticationError('Current password is incorrect');
      if (newPassword.length < 6) throw new ValidationError('New password must be at least 6 characters');
      user.password = newPassword;
      user.mustChangePassword = false;
    }

    if (name && name.trim()) user.name = name.trim();
    if (phone !== undefined) user.phone = phone ? phone.trim() : null;

    if (email && email.toLowerCase() !== user.email) {
      const newEmail = email.toLowerCase().trim();
      const existingUser = await this.userRepo.findOne({
        email: newEmail, _id: { $ne: user._id },
        ...(user.restaurantId ? { restaurantId: user.restaurantId } : {}),
      });
      if (existingUser) throw new ValidationError('Email is already in use');
      user.email = newEmail;
    }

    await this.userRepo.save(user);

    await this.activityLogRepo.log({
      type: 'PROFILE_UPDATED', severity: 'INFO',
      message: `${user.name || user.email} updated their profile`,
      userId: user._id, userEmail: user.email, userName: user.name,
      userRole: user.role, restaurantId: user.restaurantId, ipAddress, userAgent,
    });

    return {
      user: {
        id: user._id, name: user.name, email: user.email, phone: user.phone,
        role: user.role, restaurantId: user.restaurantId,
      },
    };
  }

  async forgotPassword({ email }) {
    if (!email) throw new ValidationError('Please provide an email address');

    const users = await this.userRepo.findByEmail(email);
    if (users.length === 0) {
      // Return silently to prevent email enumeration
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    // Use the first matching user (admins have globally unique emails)
    const user = users[0];

    // Generate a random token and hash it for storage
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await this.userRepo.save(user);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    try {
      await this.notificationService.sendPasswordResetEmail({ email, resetUrl });
    } catch (err) {
      console.error('Failed to send password reset email:', err);
      // Still return success to avoid leaking info
    }

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  async resetPassword({ email, token, newPassword }) {
    if (!email || !token || !newPassword) {
      throw new ValidationError('Email, token, and new password are required');
    }
    if (newPassword.length < 6) {
      throw new ValidationError('New password must be at least 6 characters');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const User = require('../../infrastructure/db/models/User');
    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password +passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new ValidationError('Invalid or expired reset link. Please request a new one.');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.mustChangePassword = false;
    await user.save();

    return { message: 'Password has been reset successfully. You can now log in with your new password.' };
  }
}

module.exports = AuthUseCases;
