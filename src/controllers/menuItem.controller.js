const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const { ErrorResponse } = require('../middlewares/error.middleware');

// @desc    Get all menu items for user's restaurant
// @route   GET /api/menu-items
// @access  Private (RESTAURANT_ADMIN, SUPERADMIN)
const getMenuItems = async (req, res, next) => {
    try {
        const query = { restaurantId: req.user.restaurantId };

        // Search filter
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { name: searchRegex },
                { code: searchRegex },
            ];
        }

        // Category filter
        if (req.query.categoryId) {
            query.categoryId = req.query.categoryId;
        }

        // Status filter
        if (req.query.status) {
            query.status = req.query.status;
        }

        const menuItems = await MenuItem.find(query)
            .populate('categoryId', 'name slug')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: menuItems.length,
            data: menuItems,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single menu item
// @route   GET /api/menu-items/:id
// @access  Private
const getMenuItem = async (req, res, next) => {
    try {
        const menuItem = await MenuItem.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
        }).populate('categoryId', 'name slug');

        if (!menuItem) {
            return next(new ErrorResponse('Menu item not found', 404));
        }

        res.status(200).json({
            success: true,
            data: menuItem,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create menu item
// @route   POST /api/menu-items
// @access  Private (RESTAURANT_ADMIN, SUPERADMIN)
const createMenuItem = async (req, res, next) => {
    try {
        req.body.restaurantId = req.user.restaurantId;

        // Verify category belongs to this restaurant
        const category = await Category.findOne({
            _id: req.body.categoryId,
            restaurantId: req.user.restaurantId,
        });

        if (!category) {
            return next(new ErrorResponse('Invalid category', 400));
        }

        const menuItem = await MenuItem.create(req.body);

        // Populate category for response
        await menuItem.populate('categoryId', 'name slug');

        res.status(201).json({
            success: true,
            message: 'Menu item created successfully',
            data: menuItem,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update menu item
// @route   PUT /api/menu-items/:id
// @access  Private (RESTAURANT_ADMIN, SUPERADMIN)
const updateMenuItem = async (req, res, next) => {
    try {
        let menuItem = await MenuItem.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
        });

        if (!menuItem) {
            return next(new ErrorResponse('Menu item not found', 404));
        }

        // If changing category, verify it belongs to the restaurant
        if (req.body.categoryId) {
            const category = await Category.findOne({
                _id: req.body.categoryId,
                restaurantId: req.user.restaurantId,
            });
            if (!category) {
                return next(new ErrorResponse('Invalid category', 400));
            }
        }

        const allowedFields = ['name', 'description', 'image', 'price', 'originalPrice', 'categoryId', 'status'];
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                menuItem[field] = req.body[field];
            }
        });

        await menuItem.save();
        await menuItem.populate('categoryId', 'name slug');

        res.status(200).json({
            success: true,
            message: 'Menu item updated successfully',
            data: menuItem,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete menu item
// @route   DELETE /api/menu-items/:id
// @access  Private (RESTAURANT_ADMIN, SUPERADMIN)
const deleteMenuItem = async (req, res, next) => {
    try {
        const menuItem = await MenuItem.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
        });

        if (!menuItem) {
            return next(new ErrorResponse('Menu item not found', 404));
        }

        await MenuItem.deleteOne({ _id: menuItem._id });

        res.status(200).json({
            success: true,
            message: 'Menu item deleted successfully',
            data: {},
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMenuItems,
    getMenuItem,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
};
