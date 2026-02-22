const jwt = require('jsonwebtoken');
const config = require('../config/env');

const generateToken = (payload) => {
    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: '1d',
    });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, config.jwtSecret);
    } catch (error) {
        return null;
    }
};

module.exports = { generateToken, verifyToken };
