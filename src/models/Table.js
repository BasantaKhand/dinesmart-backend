const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
    number: {
        type: String,
        required: [true, 'Table number is required'],
        trim: true,
    },
    capacity: {
        type: Number,
        required: [true, 'Capacity is required'],
        min: [1, 'Capacity must be at least 1'],
    },
    status: {
        type: String,
        enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED'],
        default: 'AVAILABLE',
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant ID is required'],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound index to ensure table numbers are unique per restaurant
tableSchema.index({ number: 1, restaurantId: 1 }, { unique: true });

module.exports = mongoose.model('Table', tableSchema);
