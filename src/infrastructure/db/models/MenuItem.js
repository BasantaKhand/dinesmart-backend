const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true,
    },
    code: {
        type: String,
        trim: true,
        uppercase: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    image: {
        type: String,
        trim: true,
        default: '',
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
    },
    originalPrice: {
        type: Number,
        default: null,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required'],
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active',
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

// Auto-generate code from name before saving
menuItemSchema.pre('save', async function () {
    if (this.isNew && !this.code) {
        const count = await mongoose.model('MenuItem').countDocuments({
            restaurantId: this.restaurantId,
        });
        const prefix = this.name
            .split(' ')
            .map(w => w.charAt(0).toUpperCase())
            .join('')
            .substring(0, 3);
        this.code = `DS-${prefix}-${String(count + 1).padStart(3, '0')}`;
    }
});

menuItemSchema.index({ restaurantId: 1 });
menuItemSchema.index({ restaurantId: 1, categoryId: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
