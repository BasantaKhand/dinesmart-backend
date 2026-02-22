const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const { ErrorResponse } = require('../middlewares/error.middleware');

// @desc    Get all categories for user's restaurant
// @route   GET /api/categories
// @access  Private (RESTAURANT_ADMIN, SUPERADMIN)
const getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find({ restaurantId: req.user.restaurantId })
            .sort({ createdAt: -1 });

        // Get product counts for each category
        const categoriesWithCounts = await Promise.all(
            categories.map(async (cat) => {
                const productsCount = await MenuItem.countDocuments({
                    categoryId: cat._id,
                    restaurantId: req.user.restaurantId,
                });
                return {
                    ...cat.toObject(),
                    productsCount,
                    subcategoriesCount: 0, // flat structure for now
                };
            })
        );

        res.status(200).json({
            success: true,
            count: categoriesWithCounts.length,
            data: categoriesWithCounts,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private
const getCategory = async (req, res, next) => {
    try {
        const category = await Category.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
        });

        if (!category) {
            return next(new ErrorResponse('Category not found', 404));
        }

        res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private (RESTAURANT_ADMIN, SUPERADMIN)
const createCategory = async (req, res, next) => {
    try {
        req.body.restaurantId = req.user.restaurantId;

        const category = await Category.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category,
        });
    } catch (error) {
        if (error.code === 11000) {
            return next(new ErrorResponse('A category with this name already exists', 400));
        }
        next(error);
    }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (RESTAURANT_ADMIN, SUPERADMIN)
const updateCategory = async (req, res, next) => {
    try {
        let category = await Category.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
        });

        if (!category) {
            return next(new ErrorResponse('Category not found', 404));
        }

        // Update fields
        const allowedFields = ['name', 'description', 'image', 'status'];
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                category[field] = req.body[field];
            }
        });

        await category.save();

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: category,
        });
    } catch (error) {
        if (error.code === 11000) {
            return next(new ErrorResponse('A category with this name already exists', 400));
        }
        next(error);
    }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (RESTAURANT_ADMIN, SUPERADMIN)
const deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
        });

        if (!category) {
            return next(new ErrorResponse('Category not found', 404));
        }

        // Check if there are menu items using this category
        const itemCount = await MenuItem.countDocuments({ categoryId: category._id });
        if (itemCount > 0) {
            return next(
                new ErrorResponse(
                    `Cannot delete category. ${itemCount} menu item(s) are still linked to it. Remove or reassign them first.`,
                    400
                )
            );
        }

        await Category.deleteOne({ _id: category._id });

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
            data: {},
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
};
