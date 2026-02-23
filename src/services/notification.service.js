const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');
const generateOnboardingEmail = require('../templates/onboarding-email');
const generateInviteEmail = require('../templates/invite-email');

// Email transporter (using Gmail or SMTP config from env)
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true' || false,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    }
});

class NotificationService {
    /**
     * Create a notification
     * @param {string} type - Notification type (CONTACT_MESSAGE, ORDER_ALERT, etc.)
     * @param {array} recipients - Array of recipient roles (SUPERADMIN, ADMIN)
     * @param {object} config - {title, message, data, actionUrl, priority}
     * @param {object} io - Socket.io instance
     */
    static async create(type, recipients, config, io = null) {
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // Auto-delete after 30 days

            const notification = await Notification.create({
                type,
                recipients,
                title: config.title,
                message: config.message,
                data: config.data || null,
                actionUrl: config.actionUrl || null,
                priority: config.priority || 'MEDIUM',
                expiresAt,
            });

            console.log('Notification created:', notification._id, 'Type:', type);

            // Emit real-time event to all recipient roles
            if (io) {
                recipients.forEach(role => {
                    const roomName = `${role}_notifications`;
                    const roomSockets = io.sockets.adapter.rooms.get(roomName);
                    const socketCount = roomSockets ? roomSockets.size : 0;
                    
                    console.log(`Emitting to room: ${roomName}, connected clients: ${socketCount}`);
                    
                    io.to(roomName).emit('new_notification', {
                        _id: notification._id,
                        type: notification.type,
                        title: notification.title,
                        message: notification.message,
                        data: notification.data,
                        status: notification.status,
                        priority: notification.priority,
                        actionUrl: notification.actionUrl,
                        createdAt: notification.createdAt,
                    });
                });
            } else {
                console.log('No Socket.io instance provided for real-time emission');
            }

            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Contact message notification
     */
    static async notifyContactMessage(contactMessage, io = null) {
        return this.create(
            'CONTACT_MESSAGE',
            ['SUPERADMIN'],
            {
                title: 'New Demo Request',
                message: `${contactMessage.fullName} from ${contactMessage.restaurantName} sent a demo request`,
                data: {
                    contactMessageId: contactMessage._id,
                    fullName: contactMessage.fullName,
                    restaurantName: contactMessage.restaurantName,
                    email: contactMessage.email,
                    phone: contactMessage.phone,
                },
                actionUrl: '/superadmin/contact-messages',
                priority: 'HIGH',
            },
            io
        );
    }

    /**
     * Order alert notification
     */
    static async notifyOrderAlert(order, alertType = 'NEW_ORDER', io = null) {
        const titleMap = {
            'NEW_ORDER': 'New Order Received',
            'ORDER_READY': 'Order Ready for Pickup',
            'ORDER_CANCELLED': 'Order Cancelled',
        };

        return this.create(
            'ORDER_ALERT',
            ['ADMIN', 'SUPERADMIN'],
            {
                title: titleMap[alertType] || 'Order Update',
                message: `Order #${order.orderNumber} - ${alertType.replace(/_/g, ' ')}`,
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    tableId: order.tableId,
                    alertType,
                    totalAmount: order.totalAmount,
                },
                actionUrl: '/admin/orders',
                priority: 'HIGH',
            },
            io
        );
    }

    /**
     * Payment alert notification
     */
    static async notifyPaymentAlert(payment, alertType = 'PAYMENT_RECEIVED', io = null) {
        const titleMap = {
            'PAYMENT_RECEIVED': 'Payment Received',
            'PAYMENT_FAILED': 'Payment Failed',
            'REFUND_PROCESSED': 'Refund Processed',
        };

        return this.create(
            'PAYMENT_ALERT',
            ['ADMIN', 'SUPERADMIN'],
            {
                title: titleMap[alertType] || 'Payment Update',
                message: `Payment of ${payment.amount} - ${alertType.replace(/_/g, ' ')}`,
                data: {
                    paymentId: payment._id,
                    alertType,
                    amount: payment.amount,
                    orderId: payment.orderId,
                },
                actionUrl: '/admin/payments',
                priority: alertType === 'PAYMENT_FAILED' ? 'CRITICAL' : 'MEDIUM',
            },
            io
        );
    }

    /**
     * System alert notification
     */
    static async notifySystemAlert(alertData, io = null) {
        return this.create(
            'SYSTEM_ALERT',
            ['SUPERADMIN'],
            {
                title: alertData.title || 'System Alert',
                message: alertData.message,
                data: alertData.data || null,
                priority: alertData.priority || 'HIGH',
            },
            io
        );
    }

    /**
     * Send invite email to lead after demo
     */
    static async sendOnboardingInviteEmail({ ownerEmail, ownerName, restaurantName, inviteUrl, expiresAt, customMessage }) {
        try {
            if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.warn('SMTP credentials not configured. Skipping email send.');
                return { success: false, reason: 'SMTP not configured' };
            }

            const { html, text } = generateInviteEmail({
                ownerName,
                restaurantName,
                inviteUrl,
                expiresAt,
                customMessage,
            });

            const mailOptions = {
                from: `"DineSmart" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: ownerEmail,
                subject: `Activate your DineSmart account for ${restaurantName}`,
                html,
                text,
            };

            const info = await emailTransporter.sendMail(mailOptions);
            console.log('✅ Invite email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending invite email:', error);
            throw new Error(`Invite email send failed: ${error.message}`);
        }
    }

    /**
     * Send onboarding credentials email to restaurant owner
     */
    static async sendOnboardingCredentialsEmail({ ownerEmail, ownerName, restaurantName, username, password }) {
        try {
            if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.warn('SMTP credentials not configured. Skipping email send.');
                return { success: false, reason: 'SMTP not configured' };
            }

            // Generate email content from template
            const { html, text } = generateOnboardingEmail({
                ownerName,
                restaurantName,
                username,
                password,
                frontendUrl: process.env.FRONTEND_URL
            });

            const mailOptions = {
                from: `"DineSmart" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: ownerEmail,
                subject: `Welcome to DineSmart - Login Credentials for ${restaurantName}`,
                html,
                text
            };

            const info = await emailTransporter.sendMail(mailOptions);
            console.log('✅ Email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending email:', error);
            throw new Error(`Email send failed: ${error.message}`);
        }
    }
}

module.exports = NotificationService;
