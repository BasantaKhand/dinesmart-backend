const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'User name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        trim: true,
        default: null,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false,
    },
    role: {
        type: String,
        enum: ['SUPERADMIN', 'RESTAURANT_ADMIN', 'WAITER', 'CASHIER'],
        required: [true, 'Role is required'],
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE',
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: function () {
            return this.role !== 'SUPERADMIN';
        },
    },
    mustChangePassword: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Compound unique index: same email can exist in different restaurants
// For staff (WAITER/CASHIER), email must be unique per restaurant
// For RESTAURANT_ADMIN, email must be globally unique (only one admin account per email)
userSchema.index(
    { email: 1, restaurantId: 1 },
    { 
        unique: true,
        partialFilterExpression: { 
            role: { $in: ['WAITER', 'CASHIER'] },
            restaurantId: { $exists: true }
        }
    }
);

// RESTAURANT_ADMIN and SUPERADMIN should have globally unique emails
userSchema.index(
    { email: 1 },
    {
        unique: true,
        partialFilterExpression: {
            role: { $in: ['RESTAURANT_ADMIN', 'SUPERADMIN'] }
        }
    }
);

module.exports = mongoose.model('User', userSchema);
