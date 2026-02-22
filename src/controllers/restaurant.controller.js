const Restaurant = require('../models/Restaurant');

exports.getMyPaymentSettings = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.restaurantId).select('paymentSettings name');
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                restaurantName: restaurant.name,
                paymentSettings: restaurant.paymentSettings || {}
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateMyPaymentSettings = async (req, res) => {
    try {
        const { provider, qrCodeUrl, accountName, accountId, notes } = req.body;

        const restaurant = await Restaurant.findByIdAndUpdate(
            req.restaurantId,
            {
                paymentSettings: {
                    provider,
                    qrCodeUrl,
                    accountName,
                    accountId,
                    notes
                }
            },
            { new: true }
        ).select('paymentSettings name');

        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                restaurantName: restaurant.name,
                paymentSettings: restaurant.paymentSettings || {}
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
