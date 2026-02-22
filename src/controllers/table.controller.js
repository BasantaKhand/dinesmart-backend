const Table = require('../models/Table');
const { ErrorResponse } = require('../middlewares/error.middleware');

// @desc    Get all tables for user's restaurant
// @route   GET /api/tables
// @access  Private
const getTables = async (req, res, next) => {
    try {
        const tables = await Table.find({ restaurantId: req.user.restaurantId })
            .sort({ number: 1 });

        res.status(200).json({
            success: true,
            count: tables.length,
            data: tables,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single table
// @route   GET /api/tables/:id
// @access  Private
const getTable = async (req, res, next) => {
    try {
        const table = await Table.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
        });

        if (!table) {
            return next(new ErrorResponse('Table not found', 404));
        }

        res.status(200).json({
            success: true,
            data: table,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create table
// @route   POST /api/tables
// @access  Private
const createTable = async (req, res, next) => {
    try {
        req.body.restaurantId = req.user.restaurantId;

        const tableExists = await Table.findOne({
            number: req.body.number,
            restaurantId: req.user.restaurantId,
        });

        if (tableExists) {
            return next(new ErrorResponse(`Table number ${req.body.number} already exists`, 400));
        }

        const table = await Table.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Table created successfully',
            data: table,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update table
// @route   PUT /api/tables/:id
// @access  Private
const updateTable = async (req, res, next) => {
    try {
        let table = await Table.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
        });

        if (!table) {
            return next(new ErrorResponse('Table not found', 404));
        }

        // If number is being updated, check if it's unique
        if (req.body.number && req.body.number !== table.number) {
            const tableExists = await Table.findOne({
                number: req.body.number,
                restaurantId: req.user.restaurantId,
            });

            if (tableExists) {
                return next(new ErrorResponse(`Table number ${req.body.number} already exists`, 400));
            }
        }

        table = await Table.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            success: true,
            message: 'Table updated successfully',
            data: table,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete table
// @route   DELETE /api/tables/:id
// @access  Private
const deleteTable = async (req, res, next) => {
    try {
        const table = await Table.findOne({
            _id: req.params.id,
            restaurantId: req.user.restaurantId,
        });

        if (!table) {
            return next(new ErrorResponse('Table not found', 404));
        }

        await table.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Table deleted successfully',
            data: {},
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTables,
    getTable,
    createTable,
    updateTable,
    deleteTable,
};
