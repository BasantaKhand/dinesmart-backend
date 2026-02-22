const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const { ErrorResponse } = require('./error.middleware');

const authenticate = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies[process.env.COOKIE_NAME]) {
        token = req.cookies[process.env.COOKIE_NAME];
    }

    if (!token) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
        const decoded = verifyToken(token);
        if (!decoded) {
            return next(new ErrorResponse('Not authorized to access this route', 401));
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return next(new ErrorResponse('User no longer exists', 401));
        }

        // Check restaurant status for non-superadmin users
        if (user.role !== 'SUPERADMIN') {
            const restaurant = await Restaurant.findById(user.restaurantId);
            if (!restaurant || restaurant.status !== 'ACTIVE') {
                return next(new ErrorResponse('Your restaurant is not active. Please contact support.', 403));
            }
        }

        req.user = user;
        req.restaurantId = user.restaurantId;
        next();
    } catch (error) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorResponse(
                    `User role ${req.user.role} is not authorized to access this route`,
                    403
                )
            );
        }
        next();
    };
};

module.exports = { authenticate, authorizeRoles };
