const express = require('express');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const {
    getDashboardOverview,
    getSalesOverview,
    getCategorySales,
} = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('RESTAURANT_ADMIN', 'SUPERADMIN'));

router.get('/overview', getDashboardOverview);
router.get('/sales-overview', getSalesOverview);
router.get('/category-sales', getCategorySales);

module.exports = router;
