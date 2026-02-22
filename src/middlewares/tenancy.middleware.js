const { ErrorResponse } = require('./error.middleware');

const requireRestaurantScope = (req, res, next) => {
    if (req.user.role === 'SUPERADMIN') {
        return next();
    }

    const targetRestaurantId = req.params.restaurantId || req.body.restaurantId || req.query.restaurantId;

    if (targetRestaurantId && targetRestaurantId.toString() !== req.user.restaurantId.toString()) {
        return next(new ErrorResponse('Access denied. You can only access your own restaurant data.', 403));
    }

    req.restaurantFilter = { restaurantId: req.user.restaurantId };

    next();
};

module.exports = requireRestaurantScope;
