const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { login, logout, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
