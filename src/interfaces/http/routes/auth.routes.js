const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { login, logout, getMe, updateProfile, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().trim().allow('', null).optional(),
    currentPassword: Joi.string().optional(),
    newPassword: Joi.string().min(6).optional(),
}).with('newPassword', 'currentPassword');

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
});

router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

module.exports = router;
