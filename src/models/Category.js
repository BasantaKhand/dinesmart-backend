const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
    },
    slug: {
        type: String,
        trim: true,
        lowercase: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    image: {
        type: String,
        default: '',
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

// Auto-generate slug from name before saving
categorySchema.pre('save', function () {
    if (this.isModified('name')) {
        this.slug = '/' + this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
});

// Compound index: unique slug per restaurant
categorySchema.index({ restaurantId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
