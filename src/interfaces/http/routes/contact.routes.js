const express = require('express');
const router = express.Router();
const {
    submitContactForm,
    getAllMessages,
    deleteMessage,
    sendInvite,
    validateInvite,
    activateInvite,
} = require('../controllers/contact.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

// Public route
router.post('/', submitContactForm);
router.get('/invite/validate', validateInvite);
router.post('/invite/activate', activateInvite);

// DEBUG: Test socket connection
router.get('/debug/test-socket', (req, res) => {
    try {
        const io = req.app.get('io');
        if (!io) {
            return res.status(500).json({ error: 'Socket.io not initialized' });
        }
        
        const rooms = io.sockets.adapter.rooms;
        const superadminRoom = rooms.get('superadmin');
        const socketCount = superadminRoom ? superadminRoom.size : 0;
        
        // Try to emit a test event
        io.to('superadmin').emit('new_contact_message', {
            _id: 'test-' + Date.now(),
            fullName: 'Test User',
            restaurantName: 'Test Restaurant',
            email: 'test@example.com',
            phone: '1234567890',
            message: 'Test message sent at ' + new Date().toISOString(),
            createdAt: new Date(),
        });
        
        res.json({
            socketioInitialized: true,
            superadminClientsConnected: socketCount,
            testEventEmitted: true,
            message: `Test event emitted to ${socketCount} superadmin clients`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Superadmin routes
router.get('/messages', authenticate, authorizeRoles('SUPERADMIN'), getAllMessages);
router.post('/messages/:id/send-invite', authenticate, authorizeRoles('SUPERADMIN'), sendInvite);
router.delete('/messages/:id', authenticate, authorizeRoles('SUPERADMIN'), deleteMessage);

module.exports = router;
