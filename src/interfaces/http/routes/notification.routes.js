const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    getNotificationById,
} = require('../controllers/notification.controller');

const router = express.Router();

// Protect all notification routes - authenticated users only
router.use(authenticate);

// Get all notifications for user
router.get('/', getNotifications);

// Get single notification by ID
router.get('/:id', getNotificationById);

// Mark all notifications as read (must be before :id routes)
router.put('/read-all', markAllAsRead);

// Mark specific notification as read
router.put('/:id/read', markAsRead);

// Archive notification
router.put('/:id/archive', archiveNotification);

// Delete notification
router.delete('/:id', deleteNotification);

module.exports = router;
