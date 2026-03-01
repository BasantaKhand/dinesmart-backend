const Notification = require('../db/models/Notification');
const nodemailer = require('nodemailer');
const generateOnboardingEmail = require('../templates/onboarding-email');
const generateInviteEmail = require('../templates/invite-email');

// Lazily create the email transporter so env vars are available
let _emailTransporter = null;
function getEmailTransporter() {
    if (!_emailTransporter) {
        _emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true' || false,
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || '',
            }
        });
    }
    return _emailTransporter;
}

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

            const info = await getEmailTransporter().sendMail(mailOptions);
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

            const info = await getEmailTransporter().sendMail(mailOptions);
            console.log('✅ Email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending email:', error);
            throw new Error(`Email send failed: ${error.message}`);
        }
    }

    /**
     * Notify superadmin about a new verified payment
     */
    static async notifyNewVerifiedPayment(session, io = null) {
        try {
            // Create in-app notification
            await this.create(
                'PAYMENT_VERIFIED',
                ['SUPERADMIN'],
                {
                    title: 'New Payment Verified',
                    message: `Payment verified for ${session.email}. Ready for activation.`,
                    data: {
                        sessionId: session._id,
                        email: session.email,
                        amount: session.amount,
                        planId: session.plan
                    },
                    actionUrl: '/superadmin/activations',
                    priority: 'HIGH'
                },
                io
            );

            // Also emit a specific event for the activations table to refresh
            if (io) {
                io.to('SUPERADMIN_notifications').emit('new_verified_payment', {
                    sessionId: session._id,
                    email: session.email,
                    amount: session.amount,
                });
            }

            console.log('✅ Superadmin notified of verified payment:', session._id);
            return { success: true };
        } catch (error) {
            console.error('❌ Error notifying superadmin:', error);
            throw error;
        }
    }

    /**
     * Send activation invite email to restaurant owner
     */
    static async sendActivationInviteEmail({ email, planName, activationLink, expiresIn }) {
        try {
            if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.warn('SMTP credentials not configured. Skipping email send.');
                return { success: false, reason: 'SMTP not configured' };
            }

            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activate Your DineSmart Account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #3a3a3a; line-height: 1.6; background-color: #f8f8f8; margin: 0; padding: 20px;">
    <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
        <div style="background: #FF5C00; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">DineSmart</h1>
        </div>
        <div style="padding: 32px 24px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #1a1a1a;">Your Payment is Verified!</h2>
            <p style="margin: 0 0 16px; color: #555;">
                Great news! Your payment for the <strong>${planName}</strong> plan has been verified. 
                You're just one step away from using DineSmart.
            </p>
            <p style="margin: 0 0 24px; color: #555;">
                Click the button below to set up your password and complete your restaurant registration.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${activationLink}" style="display: inline-block; background: #FF5C00; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Activate My Account
                </a>
            </div>
            <p style="margin: 24px 0 0; font-size: 13px; color: #888;">
                This link expires in ${expiresIn}. If you didn't request this, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                If the button doesn't work, copy this link:<br>
                <a href="${activationLink}" style="color: #FF5C00; word-break: break-all;">${activationLink}</a>
            </p>
        </div>
    </div>
</body>
</html>`;

            const textContent = `
Your Payment is Verified!

Great news! Your payment for the ${planName} plan has been verified.

Click the link below to activate your account:
${activationLink}

This link expires in ${expiresIn}.

If you didn't request this, please ignore this email.
`;

            const mailOptions = {
                from: `"DineSmart" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: email,
                subject: 'Activate Your DineSmart Account',
                html: htmlContent,
                text: textContent
            };

            const info = await getEmailTransporter().sendMail(mailOptions);
            console.log('✅ Activation invite email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending activation email:', error);
            throw new Error(`Activation email send failed: ${error.message}`);
        }
    }

    // ============================================
    // REAL-TIME NOTIFICATIONS (Non-Persistent)
    // ============================================

    /**
     * Emit a real-time notification without persisting to database
     * Used for order status updates that don't need to be stored
     */
    static emitRealTime(io, restaurantId, recipients, notification) {
        if (!io) {
            console.log('No Socket.io instance for real-time emission');
            return;
        }

        const payload = {
            _id: `rt_${Date.now()}`,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data || null,
            priority: notification.priority || 'MEDIUM',
            status: 'UNREAD',
            createdAt: new Date().toISOString(),
            isRealTimeOnly: true, // Flag indicating this is not persisted
        };

        // Emit to restaurant-specific role rooms
        recipients.forEach(role => {
            const roomName = `restaurant_${restaurantId}_${role}`;
            const roomSockets = io.sockets.adapter.rooms.get(roomName);
            const socketCount = roomSockets ? roomSockets.size : 0;

            console.log(`📡 RT emit to ${roomName}: "${notification.title}" (${socketCount} clients)`);
            io.to(roomName).emit('new_notification', payload);
        });
    }

    /**
     * Create a persistent notification for a specific restaurant
     */
    static async createForRestaurant(restaurantId, type, recipients, config, io = null) {
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const notification = await Notification.create({
                restaurantId,
                type,
                recipients,
                title: config.title,
                message: config.message,
                data: config.data || null,
                actionUrl: config.actionUrl || null,
                priority: config.priority || 'MEDIUM',
                expiresAt,
            });

            console.log('Restaurant notification created:', notification._id, 'Type:', type);

            // Emit to restaurant-specific role rooms
            if (io) {
                recipients.forEach(role => {
                    const roomName = `restaurant_${restaurantId}_${role}`;
                    const roomSockets = io.sockets.adapter.rooms.get(roomName);
                    const socketCount = roomSockets ? roomSockets.size : 0;

                    console.log(`Emitting to restaurant room: ${roomName}, clients: ${socketCount}`);

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
            }

            return notification;
        } catch (error) {
            console.error('Error creating restaurant notification:', error);
            throw error;
        }
    }

    // ============================================
    // ORDER EVENT NOTIFICATIONS
    // ============================================

    /**
     * New order created - notify kitchen and admin (persistent)
     */
    static async notifyNewOrder(order, io = null) {
        return this.createForRestaurant(
            order.restaurantId,
            'NEW_ORDER',
            ['ADMIN', 'RESTAURANT_ADMIN', 'KITCHEN'],
            {
                title: 'New Order',
                message: `Order #${order.orderNumber} for Table ${order.tableId?.number || 'N/A'}`,
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    tableNumber: order.tableId?.number,
                    itemCount: order.items?.length || 0,
                    total: order.total,
                },
                priority: 'HIGH',
            },
            io
        );
    }

    /**
     * Order status updated - notify waiter (persistent)
     */
    static async notifyOrderStatusToWaiter(order, status, io = null) {
        const statusMap = {
            'PENDING': 'Pending',
            'COOKING': 'Cooking',
            'COOKED': 'Cooked',
            'READY': 'Ready',
            'SERVED': 'Served',
            'COMPLETED': 'Completed',
            'CANCELLED': 'Cancelled'
        };

        const statusText = statusMap[status] || status;

        return this.createForRestaurant(
            order.restaurantId,
            'ORDER_STATUS_UPDATE',
            ['WAITER'],
            {
                title: `Order ${statusText}`,
                message: `Order #${order.orderNumber} for Table ${order.tableId?.number || 'N/A'} is now ${statusText}`,
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    tableNumber: order.tableId?.number,
                    status: status
                },
                priority: (status === 'READY' || status === 'COOKED') ? 'HIGH' : 'MEDIUM',
            },
            io
        );
    }

    /**
     * Order ready for serving - notify waiter (persistent)
     */
    static async notifyOrderReady(order, io = null) {
        return this.createForRestaurant(
            order.restaurantId,
            'ORDER_READY',
            ['WAITER'],
            {
                title: 'Order Ready! 🍽️',
                message: `Order #${order.orderNumber} is ready for Table ${order.tableId?.number || 'N/A'}`,
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    tableNumber: order.tableId?.number,
                },
                priority: 'HIGH',
            },
            io
        );
    }

    /**
     * Order served - notify admin/cashier (persistent)
     */
    static async notifyOrderServed(order, io = null) {
        return this.createForRestaurant(
            order.restaurantId,
            'ORDER_SERVED',
            ['ADMIN', 'RESTAURANT_ADMIN', 'CASHIER'],
            {
                title: 'Order Served',
                message: `Order #${order.orderNumber} served at Table ${order.tableId?.number || 'N/A'}`,
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    tableNumber: order.tableId?.number,
                },
                priority: 'MEDIUM',
            },
            io
        );
    }

    /**
     * Order completed (ready for payment) - notify cashier (persistent)
     */
    static async notifyOrderCompleted(order, io = null) {
        return this.createForRestaurant(
            order.restaurantId,
            'ORDER_COMPLETED',
            ['CASHIER'],
            {
                title: 'Bill Ready',
                message: `Table ${order.tableId?.number || 'N/A'} - Order #${order.orderNumber} ready for payment`,
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    tableNumber: order.tableId?.number,
                    total: order.total,
                },
                priority: 'HIGH',
            },
            io
        );
    }

    /**
     * Bill printed by waiter - notify cashier (persistent)
     */
    static async notifyBillPrinted(order, io = null) {
        return this.createForRestaurant(
            order.restaurantId,
            'BILL_PRINTED',
            ['CASHIER'],
            {
                title: 'Bill Printed',
                message: `Table ${order.tableId?.number || 'N/A'} bill printed - ${order.total?.toLocaleString() || 0} Rs`,
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    tableNumber: order.tableId?.number,
                    total: order.total,
                },
                priority: 'HIGH',
            },
            io
        );
    }

    /**
     * Payment pending in queue - notify cashier (persistent)
     */
    static async notifyPaymentPending(order, io = null) {
        return this.createForRestaurant(
            order.restaurantId,
            'PAYMENT_PENDING',
            ['CASHIER'],
            {
                title: 'Payment Pending',
                message: `Table ${order.tableId?.number || 'N/A'} waiting for payment - ${order.total?.toLocaleString() || 0} Rs`,
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    tableNumber: order.tableId?.number,
                    total: order.total,
                },
                priority: 'HIGH',
            },
            io
        );
    }

    /**
     * Payment completed - notify admin and waiter (persistent)
     */
    static async notifyPaymentCompleted(order, paymentMethod, io = null) {
        return this.createForRestaurant(
            order.restaurantId,
            'PAYMENT_VERIFIED',
            ['ADMIN', 'RESTAURANT_ADMIN', 'WAITER'],
            {
                title: 'Payment Received ✓',
                message: `Order #${order.orderNumber} paid via ${paymentMethod} - ${order.total?.toLocaleString() || 0} Rs`,
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    tableNumber: order.tableId?.number,
                    total: order.total,
                    paymentMethod,
                },
                priority: 'MEDIUM',
            },
            io
        );
    }

    /**
     * Items added to existing order - notify kitchen (persistent)
     */
    static async notifyItemsAdded(order, newItemCount, io = null) {
        return this.createForRestaurant(
            order.restaurantId,
            'ORDER_ALERT',
            ['KITCHEN', 'RESTAURANT_ADMIN'],
            {
                title: 'New Items Added',
                message: `${newItemCount} new items added to Order #${order.orderNumber} (Table ${order.tableId?.number})`,
                data: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    tableNumber: order.tableId?.number,
                    newItemCount,
                },
                priority: 'HIGH',
            },
            io
        );
    }

    /**
     * Send password reset email
     */
    static async sendPasswordResetEmail({ email, resetUrl }) {
        try {
            if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.warn('SMTP credentials not configured. Skipping password reset email.');
                console.log('🔗 Password reset URL (dev mode):', resetUrl);
                return { success: false, reason: 'SMTP not configured' };
            }

            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #3a3a3a; line-height: 1.6; background-color: #ffffff; margin: 0; padding: 0;">
    <div style="max-width: 520px; margin: 0; padding: 24px;">
        <div style="font-weight: 700; font-size: 16px; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">DineSmart</div>
        <div style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #18181b;">Reset your password</div>
        <p style="font-size: 14px; line-height: 1.7; color: #52525b; margin-bottom: 16px;">
            We received a request to reset the password for your DineSmart account. Click the button below to set a new password.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #FF5C00; color: #ffffff !important; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 8px 0 12px;">Reset Password</a>
        <p style="font-size: 12px; color: #71717a; margin-top: 10px;">This link will expire in 15 minutes.</p>
        <p style="font-size: 14px; line-height: 1.7; color: #52525b; margin-bottom: 16px;">If the button doesn't work, copy and paste this URL into your browser:<br/>${resetUrl}</p>
        <p style="font-size: 14px; line-height: 1.7; color: #52525b; margin-bottom: 16px;">If you didn't request this, you can safely ignore this email.</p>
        <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #71717a;">This is an automated message from DineSmart.</div>
    </div>
</body>
</html>`;

            const textContent = `Reset your password

We received a request to reset the password for your DineSmart account.

Click the link below to set a new password:
${resetUrl}

This link will expire in 15 minutes.

If you didn't request this, you can safely ignore this email.

This is an automated message from DineSmart.`;

            const mailOptions = {
                from: `"DineSmart" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: email,
                subject: 'Reset your DineSmart password',
                html: htmlContent,
                text: textContent,
            };

            const info = await getEmailTransporter().sendMail(mailOptions);
            console.log('✅ Password reset email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending password reset email:', error);
            throw new Error(`Password reset email send failed: ${error.message}`);
        }
    }
}

module.exports = NotificationService;
