const User = require('../models/User');
const crypto = require('crypto');

/**
 * @desc    Get all staff members for the restaurant
 * @route   GET /api/staff
 * @access  Private (RESTAURANT_ADMIN)
 */
exports.getStaff = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const startIndex = (page - 1) * limit;

        // Build filter query
        const filter = {
            restaurantId: req.restaurantId,
            role: { $in: ['WAITER', 'CASHIER'] } // Only fetch staff, not admins
        };

        // Optional filters
        if (req.query.role && req.query.role !== 'ALL') {
            filter.role = req.query.role;
        }
        if (req.query.status && req.query.status !== 'ALL') {
            filter.status = req.query.status;
        }
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { phone: searchRegex }
            ];
        }

        const total = await User.countDocuments(filter);

        const staff = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit)
            .select('-password');

        res.status(200).json({
            success: true,
            data: staff,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get single staff member
 * @route   GET /api/staff/:id
 * @access  Private (RESTAURANT_ADMIN)
 */
exports.getStaffById = async (req, res) => {
    try {
        const staff = await User.findOne({
            _id: req.params.id,
            restaurantId: req.restaurantId,
            role: { $in: ['WAITER', 'CASHIER'] }
        }).select('-password');

        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        res.status(200).json({
            success: true,
            data: staff
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Create new staff member
 * @route   POST /api/staff
 * @access  Private (RESTAURANT_ADMIN)
 */
exports.createStaff = async (req, res) => {
    try {
        const { name, email, phone, role, status } = req.body;

        // Validate role - only allow staff roles
        if (!['WAITER', 'CASHIER'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Staff can only be WAITER or CASHIER'
            });
        }

        // Check if email already exists as RESTAURANT_ADMIN or SUPERADMIN (globally unique)
        const existingAdmin = await User.findOne({ 
            email: email.toLowerCase(),
            role: { $in: ['RESTAURANT_ADMIN', 'SUPERADMIN'] }
        });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'This email is registered as a restaurant owner or admin'
            });
        }

        // Check if email already exists as staff in THIS restaurant
        const existingStaffInRestaurant = await User.findOne({ 
            email: email.toLowerCase(),
            restaurantId: req.restaurantId,
            role: { $in: ['WAITER', 'CASHIER'] }
        });
        if (existingStaffInRestaurant) {
            return res.status(400).json({
                success: false,
                message: 'This email is already registered as staff in your restaurant'
            });
        }

        // Generate a random password (8 characters)
        const generatedPassword = crypto.randomBytes(4).toString('hex');

        // Create the staff member
        const staff = await User.create({
            name,
            email: email.toLowerCase(),
            phone: phone || null,
            password: generatedPassword,
            role,
            status: status || 'ACTIVE',
            restaurantId: req.restaurantId,
            mustChangePassword: true
        });

        // Return staff without password but include the generated credentials
        const staffResponse = staff.toObject();
        delete staffResponse.password;

        res.status(201).json({
            success: true,
            message: 'Staff member created successfully',
            data: {
                staff: staffResponse,
                credentials: {
                    email: staff.email,
                    password: generatedPassword
                }
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update staff member
 * @route   PUT /api/staff/:id
 * @access  Private (RESTAURANT_ADMIN)
 */
exports.updateStaff = async (req, res) => {
    try {
        const { name, email, phone, role, status } = req.body;

        // Find staff member
        const staff = await User.findOne({
            _id: req.params.id,
            restaurantId: req.restaurantId,
            role: { $in: ['WAITER', 'CASHIER'] }
        });

        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        // Validate role if provided
        if (role && !['WAITER', 'CASHIER'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Staff can only be WAITER or CASHIER'
            });
        }

        // Check if email is being changed and if new email already exists
        if (email && email.toLowerCase() !== staff.email) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already registered'
                });
            }
        }

        // Update fields
        if (name) staff.name = name;
        if (email) staff.email = email.toLowerCase();
        if (phone !== undefined) staff.phone = phone;
        if (role) staff.role = role;
        if (status) staff.status = status;

        await staff.save();

        const staffResponse = staff.toObject();
        delete staffResponse.password;

        res.status(200).json({
            success: true,
            message: 'Staff member updated successfully',
            data: staffResponse
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete staff member
 * @route   DELETE /api/staff/:id
 * @access  Private (RESTAURANT_ADMIN)
 */
exports.deleteStaff = async (req, res) => {
    try {
        const staff = await User.findOneAndDelete({
            _id: req.params.id,
            restaurantId: req.restaurantId,
            role: { $in: ['WAITER', 'CASHIER'] }
        });

        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Staff member deleted successfully'
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Toggle staff status (active/inactive)
 * @route   PATCH /api/staff/:id/status
 * @access  Private (RESTAURANT_ADMIN)
 */
exports.toggleStaffStatus = async (req, res) => {
    try {
        const staff = await User.findOne({
            _id: req.params.id,
            restaurantId: req.restaurantId,
            role: { $in: ['WAITER', 'CASHIER'] }
        });

        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        // Toggle status
        staff.status = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await staff.save();

        const staffResponse = staff.toObject();
        delete staffResponse.password;

        res.status(200).json({
            success: true,
            message: `Staff member ${staff.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
            data: staffResponse
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Reset staff password
 * @route   POST /api/staff/:id/reset-password
 * @access  Private (RESTAURANT_ADMIN)
 */
exports.resetStaffPassword = async (req, res) => {
    try {
        const staff = await User.findOne({
            _id: req.params.id,
            restaurantId: req.restaurantId,
            role: { $in: ['WAITER', 'CASHIER'] }
        });

        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        // Generate new password
        const newPassword = crypto.randomBytes(4).toString('hex');
        staff.password = newPassword;
        staff.mustChangePassword = true;
        await staff.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successfully',
            data: {
                email: staff.email,
                newPassword
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
