require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  cookieName: process.env.COOKIE_NAME,
  nodeEnv: process.env.NODE_ENV || 'development',
  esewa: {
    merchantId: process.env.ESEWA_MERCHANT_ID || 'EPAYTEST',
    secretKey: process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q',
    baseUrl: process.env.ESEWA_BASE_URL || 'https://rc-epay.esewa.com.np',
    successUrl: process.env.ESEWA_SUCCESS_URL || 'http://localhost:3000/payment/success',
    failureUrl: process.env.ESEWA_FAILURE_URL || 'http://localhost:3000/payment/failure',
  }
};
