const { AuthenticationError, NotFoundError, ValidationError, AuthorizationError } = require('../../shared/errors');
const { generateToken } = require('../../shared/utils/jwt');

class AuthUseCases {
  constructor({ userRepository, restaurantRepository, activityLogRepository }) {
    this.userRepo = userRepository;
    this.restaurantRepo = restaurantRepository;
    this.activityLogRepo = activityLogRepository;
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
}

module.exports = AuthUseCases;
