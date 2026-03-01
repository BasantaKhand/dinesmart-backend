const { NotFoundError, ValidationError } = require('../../shared/errors');
const crypto = require('crypto');

class RestaurantUseCases {
  constructor({ restaurantRepository, userRepository, activityLogRepository }) {
    this.restaurantRepo = restaurantRepository;
    this.userRepo = userRepository;
    this.activityLogRepo = activityLogRepository;
  }

  async getAllRestaurants(query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const total = await this.restaurantRepo.countDocuments();
    const restaurants = await this.restaurantRepo.find({
      sort: { createdAt: -1 }, skip: startIndex, limit,
    });

    const restaurantsWithCounts = await Promise.all(
      restaurants.map(async (restaurant) => {
        const userCount = await this.userRepo.countDocuments({ restaurantId: restaurant._id });
        return { ...restaurant.toObject(), userCount };
      })
    );

    return {
      data: restaurantsWithCounts,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createRestaurant(data, reqUser) {
    const { name, address, status, ownerName, email, password } = data;
    if (!ownerName || !email) throw new ValidationError('Owner name and email are required to create a restaurant');

    const existingUser = await this.userRepo.findOne({ email });
    if (existingUser) throw new ValidationError('Email is already registered');

    const restaurant = await this.restaurantRepo.create({ name, address, status: status || 'ACTIVE' });
    const tempPassword = password || crypto.randomBytes(4).toString('hex');

    const user = await this.userRepo.create({
      name: ownerName, email, password: tempPassword,
      role: 'RESTAURANT_ADMIN', restaurantId: restaurant._id, mustChangePassword: true,
    });

    // Fire-and-forget activity log
    this.activityLogRepo.log({
      type: 'RESTAURANT_CREATED', severity: 'INFO',
      message: `New restaurant "${name}" created with admin ${email}`,
      userId: reqUser?._id, userEmail: reqUser?.email, userName: reqUser?.name,
      userRole: reqUser?.role, restaurantId: restaurant._id, restaurantName: name,
      metadata: { address, ownerName },
    });

    return { restaurant, credentials: { email: user.email, tempPassword } };
  }

  async updateRestaurantStatus(id, status, reqUser) {
    const oldRestaurant = await this.restaurantRepo.findById(id);
    const oldStatus = oldRestaurant?.status;

    const restaurant = await this.restaurantRepo.findByIdAndUpdate(id, { status }, { runValidators: true });
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    const activityType = status === 'ACTIVE' ? 'RESTAURANT_ACTIVATED'
      : status === 'SUSPENDED' ? 'RESTAURANT_SUSPENDED' : 'ROLE_CHANGED';

    this.activityLogRepo.log({
      type: activityType, severity: status === 'SUSPENDED' ? 'WARNING' : 'INFO',
      message: `Restaurant "${restaurant.name}" status changed from ${oldStatus} to ${status}`,
      userId: reqUser?._id, userEmail: reqUser?.email, userName: reqUser?.name,
      userRole: reqUser?.role, restaurantId: restaurant._id, restaurantName: restaurant.name,
      metadata: { oldStatus, newStatus: status },
    });

    return restaurant;
  }

  async deleteRestaurant(id, reqUser) {
    const restaurant = await this.restaurantRepo.findByIdAndDelete(id);
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    const deletedUsers = await this.userRepo.deleteMany({ restaurantId: restaurant._id });

    this.activityLogRepo.log({
      type: 'RESTAURANT_DELETED', severity: 'WARNING',
      message: `Restaurant "${restaurant.name}" was deleted along with ${deletedUsers.deletedCount} associated users`,
      userId: reqUser?._id, userEmail: reqUser?.email, userName: reqUser?.name,
      userRole: reqUser?.role, restaurantName: restaurant.name,
      metadata: { restaurantAddress: restaurant.address, deletedUsersCount: deletedUsers.deletedCount },
    });
  }

  async resetRestaurantPassword(id) {
    const adminUser = await this.userRepo.findOne({ restaurantId: id, role: 'RESTAURANT_ADMIN' });
    if (!adminUser) throw new NotFoundError('No admin user found for this restaurant');

    const tempPassword = crypto.randomBytes(4).toString('hex');
    adminUser.password = tempPassword;
    adminUser.mustChangePassword = true;
    await this.userRepo.save(adminUser);

    return { email: adminUser.email, tempPassword };
  }

  async getMyPaymentSettings(restaurantId) {
    const restaurant = await this.restaurantRepo.findById(restaurantId, 'paymentSettings name');
    if (!restaurant) throw new NotFoundError('Restaurant not found');
    return { restaurantName: restaurant.name, paymentSettings: restaurant.paymentSettings || {} };
  }

  async updateMyPaymentSettings(restaurantId, { provider, qrCodeUrl, accountName, accountId, notes }) {
    const restaurant = await this.restaurantRepo.findByIdAndUpdate(
      restaurantId,
      { paymentSettings: { provider, qrCodeUrl, accountName, accountId, notes } }
    );
    if (!restaurant) throw new NotFoundError('Restaurant not found');
    return { restaurantName: restaurant.name, paymentSettings: restaurant.paymentSettings || {} };
  }
}

module.exports = RestaurantUseCases;
