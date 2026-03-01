const express = require('express');
const router = express.Router();
const { handleEsewaWebhook } = require('../controllers/payment.controller');

router.post('/esewa/webhook', handleEsewaWebhook);

module.exports = router;
