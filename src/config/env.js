require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  cookieName: process.env.COOKIE_NAME,
  nodeEnv: process.env.NODE_ENV || 'development'
};
