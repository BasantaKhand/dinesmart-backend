const mongoose = require('mongoose');
require('./Counter'); // Load Counter model before using it

const orderItemSchema = new mongoose.Schema({
    menuItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['PREPARING', 'READY', 'COOKED', 'SERVED'],
        default: 'PREPARING'
    },
    notes: String
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        sparse: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
        index: true
    },
    waiterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
    subtotal: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    serviceCharge: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'COOKING', 'COOKED', 'SERVED', 'COMPLETED', 'CANCELLED'],
        default: 'PENDING',
        index: true
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PAID', 'PARTIAL'],
        default: 'PENDING',
        index: true
    },
    paymentMethod: {
        type: String,
        enum: ['CASH', 'CARD', 'QR', 'CREDIT'],
        default: 'CASH'
    },
    paymentProvider: {
        type: String,
        enum: ['ESEWA', 'STRIPE', 'MANUAL'],
        default: 'MANUAL'
    },
    paymentReference: {
        type: String,
        trim: true
    },
    orderType: {
        type: String,
        enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
        default: 'DINE_IN'
    },
    discount: {
        type: Number,
        default: 0
    },
    discountType: {
        type: String,
        enum: ['PERCENTAGE', 'FIXED'],
        default: 'FIXED'
    },
    billPrinted: {
        type: Boolean,
        default: false
    },
    billPrintedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Auto-generate order number: ORD-YYYYMMDD-XXX
// Use atomic increment to avoid race conditions
orderSchema.pre('save', async function () {
    if (this.isNew && !this.orderNumber) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const counterKey = `order_counter_${this.restaurantId}_${dateStr}`;

        try {
            // Try to get or create a counter document
            const Counter = mongoose.model('Counter');
            const counter = await Counter.findByIdAndUpdate(
                counterKey,
                { $inc: { count: 1 } },
                { returnDocument: 'after', upsert: true }
            );
            
            this.orderNumber = `ORD-${dateStr}-${String(counter.count).padStart(3, '0')}`;
        } catch (err) {
            // Fallback if Counter model doesn't exist
            const count = await mongoose.model('Order').countDocuments({
                restaurantId: this.restaurantId,
                orderNumber: { $regex: `^ORD-${dateStr}` }
            });
            this.orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(3, '0')}`;
        }
    }
});

// Create compound unique index for orderNumber per restaurant
orderSchema.index({ restaurantId: 1, orderNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Order', orderSchema);
