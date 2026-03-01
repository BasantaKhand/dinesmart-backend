const { NotFoundError, ValidationError } = require('../../shared/errors');
const crypto = require('crypto');

class StaffUseCases {
  constructor({ userRepository }) {
    this.userRepo = userRepository;
  }

  async getStaff(restaurantId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const filter = { restaurantId, role: { $in: ['WAITER', 'CASHIER'] } };
    if (query.role && query.role !== 'ALL') filter.role = query.role;
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
    }

    const total = await this.userRepo.countDocuments(filter);
    const staff = await this.userRepo.find(filter, {
      sort: { createdAt: -1 }, skip: startIndex, limit, select: '-password',
    });

    return { data: staff, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getStaffById(id, restaurantId) {
    const staff = await this.userRepo.findOne({
      _id: id, restaurantId, role: { $in: ['WAITER', 'CASHIER'] },
    });
    if (!staff) throw new NotFoundError('Staff member not found');
    const staffObj = staff.toObject(); delete staffObj.password;
    return staffObj;
  }

  async createStaff(data, restaurantId) {
    const { name, email, phone, role, status } = data;
    if (!['WAITER', 'CASHIER'].includes(role)) throw new ValidationError('Invalid role. Staff can only be WAITER or CASHIER');

    const existingAdmin = await this.userRepo.findOne({
      email: email.toLowerCase(), role: { $in: ['RESTAURANT_ADMIN', 'SUPERADMIN'] },
    });
    if (existingAdmin) throw new ValidationError('This email is registered as a restaurant owner or admin');

    const existingStaff = await this.userRepo.findOne({
      email: email.toLowerCase(), restaurantId, role: { $in: ['WAITER', 'CASHIER'] },
    });
    if (existingStaff) throw new ValidationError('This email is already registered as staff in your restaurant');

    const generatedPassword = crypto.randomBytes(4).toString('hex');
    const staff = await this.userRepo.create({
      name, email: email.toLowerCase(), phone: phone || null,
      password: generatedPassword, role, status: status || 'ACTIVE',
      restaurantId, mustChangePassword: true,
    });

    const staffResponse = staff.toObject(); delete staffResponse.password;
    return { staff: staffResponse, credentials: { email: staff.email, password: generatedPassword } };
  }

  async updateStaff(id, data, restaurantId) {
    const { name, email, phone, role, status } = data;
    const staff = await this.userRepo.findOne({
      _id: id, restaurantId, role: { $in: ['WAITER', 'CASHIER'] },
    });
    if (!staff) throw new NotFoundError('Staff member not found');

    if (role && !['WAITER', 'CASHIER'].includes(role)) throw new ValidationError('Invalid role. Staff can only be WAITER or CASHIER');

    if (email && email.toLowerCase() !== staff.email) {
      const existingUser = await this.userRepo.findOne({ email: email.toLowerCase() });
      if (existingUser) throw new ValidationError('Email is already registered');
    }

    if (name) staff.name = name;
    if (email) staff.email = email.toLowerCase();
    if (phone !== undefined) staff.phone = phone;
    if (role) staff.role = role;
    if (status) staff.status = status;
    await this.userRepo.save(staff);

    const staffResponse = staff.toObject(); delete staffResponse.password;
    return staffResponse;
  }

  async deleteStaff(id, restaurantId) {
    const staff = await this.userRepo.findOneAndDelete({
      _id: id, restaurantId, role: { $in: ['WAITER', 'CASHIER'] },
    });
    if (!staff) throw new NotFoundError('Staff member not found');
  }

  async toggleStaffStatus(id, restaurantId) {
    const staff = await this.userRepo.findOne({
      _id: id, restaurantId, role: { $in: ['WAITER', 'CASHIER'] },
    });
    if (!staff) throw new NotFoundError('Staff member not found');
    staff.status = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await this.userRepo.save(staff);
    const staffResponse = staff.toObject(); delete staffResponse.password;
    return staffResponse;
  }

  async resetStaffPassword(id, restaurantId) {
    const staff = await this.userRepo.findOne({
      _id: id, restaurantId, role: { $in: ['WAITER', 'CASHIER'] },
    });
    if (!staff) throw new NotFoundError('Staff member not found');

    const newPassword = crypto.randomBytes(4).toString('hex');
    staff.password = newPassword;
    staff.mustChangePassword = true;
    await this.userRepo.save(staff);
    return { email: staff.email, newPassword };
  }
}

module.exports = StaffUseCases;
