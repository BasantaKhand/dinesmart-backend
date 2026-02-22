const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const { generateToken } = require('../utils/jwt');
const { ErrorResponse } = require('../middlewares/error.middleware');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    try {
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return next(new ErrorResponse('Invalid credentials', 401));
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return next(new ErrorResponse('Invalid credentials', 401));
        }

        // Check restaurant status for non-superadmin users
        if (user.role !== 'SUPERADMIN') {
            const restaurant = await Restaurant.findById(user.restaurantId);
            if (!restaurant) {
                return next(new ErrorResponse('Restaurant not found', 404));
            }
            if (restaurant.status !== 'ACTIVE') {
                return next(new ErrorResponse(`Access denied. Restaurant status is ${restaurant.status}`, 403));
            }
        }

        const token = generateToken({ id: user._id });

        const cookieOptions = {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
        };

        res
            .status(200)
            .cookie(process.env.COOKIE_NAME, token, cookieOptions)
            .json({
                success: true,
                message: 'Logged in successfully',
                data: {
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        restaurantId: user.restaurantId,
                        mustChangePassword: user.mustChangePassword,
                    },
                    token,
                },
            });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user / Clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
    res.cookie(process.env.COOKIE_NAME, 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        data: {},
    });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
    res.status(200).json({
        success: true,
        data: {
            user: req.user,
        },
    });
};

module.exports = {
    login,
    logout,
    getMe,
};
