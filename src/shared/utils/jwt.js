const jwt = require('jsonwebtoken');
const config = require('../../config/env');

const generateToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '1d' });
};

const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};

module.exports = { generateToken, verifyToken };
