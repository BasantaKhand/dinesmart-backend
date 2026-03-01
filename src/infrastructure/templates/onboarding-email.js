/**
 * Onboarding email template for restaurant owners
 */
function generateOnboardingEmail({ ownerName, restaurantName, username, password, frontendUrl, paymentToken, restaurantId, planId }) {
    const loginUrl = frontendUrl || 'http://localhost:3000';
    const paymentUrl = restaurantId && paymentToken 
        ? `${loginUrl}/payment?restaurantId=${restaurantId}&token=${paymentToken}${planId ? `&planId=${planId}` : ''}`
        : null;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DineSmart - Welcome</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
            color: #3a3a3a;
            line-height: 1.6;
            background-color: #ffffff;
        }
        
        .container {
            max-width: 500px;
            margin: 0;
            padding: 20px;
        }
        
        .header {
            margin-bottom: 28px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 20px;
        }
        
        .brand {
            font-size: 14px;
            font-weight: 600;
            color: #3a3a3a;
            letter-spacing: 0.5px;
        }
        
        .greeting {
            font-size: 15px;
            margin-bottom: 16px;
            margin-top: 20px;
        }
        
        .content-text {
            font-size: 14px;
            color: #555;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        
        .section {
            margin-bottom: 24px;
        }
        
        .section-label {
            font-size: 12px;
            font-weight: 600;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }
        
        .credentials {
            background-color: #f8f8f8;
            border: 1px solid #e0e0e0;
            padding: 16px;
            border-radius: 4px;
            font-size: 13px;
        }
        
        .credentials p {
            margin-bottom: 8px;
            line-height: 1.5;
        }
        
        .credentials p:last-child {
            margin-bottom: 0;
        }
        
        .label {
            color: #666;
            margin-right: 8px;
        }
        
        .value {
            font-family: 'Courier New', monospace;
            font-weight: 500;
            color: #3a3a3a;
        }
        
        .warning {
            background-color: #fafafa;
            border-left: 3px solid #d0d0d0;
            padding: 12px 14px;
            margin: 16px 0;
            border-radius: 2px;
            font-size: 13px;
            color: #555;
        }
        
        .warning-label {
            font-weight: 600;
            color: #3a3a3a;
        }
        
        .link-section {
            margin: 24px 0;
        }
        
        .link {
            color: #0066cc;
            text-decoration: none;
            font-weight: 500;
        }
        
        .link:hover {
            text-decoration: underline;
        }
        
        .divider {
            border: none;
            border-top: 1px solid #e0e0e0;
            margin: 24px 0;
        }
        
        .footer {
            margin-top: 28px;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #999;
        }
        
        .footer p {
            margin-bottom: 8px;
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="brand">DineSmart</div>
        </div>
        
        <!-- Greeting -->
        <div class="greeting">
            Hello ${ownerName},
        </div>
        
        <!-- Intro -->
        <div class="content-text">
            Your restaurant <strong>${restaurantName}</strong> has been successfully onboarded to DineSmart. Use the credentials below to log in and start managing your restaurant.
        </div>
        
        ${paymentUrl ? `
        <!-- Payment Required Notice -->
        <div class="warning" style="background-color: #fff8f0; border-left-color: #FF5C00;">
            <span class="warning-label" style="color: #FF5C00;">Action Required:</span> Your account is pending activation. Please complete your subscription payment to access all features.
        </div>
        
        <!-- Payment Link -->
        <div class="link-section">
            <p><a href="${paymentUrl}" class="link" style="color: #FF5C00;">Complete Payment →</a></p>
        </div>
        ` : ''}
        
        <!-- Credentials -->
        <div class="section">
            <div class="section-label">Login Credentials</div>
            <div class="credentials">
                <p><span class="label">Email:</span><span class="value">${username}</span></p>
                <p><span class="label">Password:</span><span class="value">${password}</span></p>
            </div>
        </div>
        
        <!-- Warning -->
        <div class="warning">
            <span class="warning-label">Important:</span> Please change your password immediately after your first login.
        </div>
        
        <!-- Link -->
        <div class="link-section">
            <p><a href="${loginUrl}/auth/login" class="link">Login to DineSmart →</a></p>
        </div>
        
        <hr class="divider">
        
        <!-- Support -->
        <div class="content-text">
            If you have any questions or need assistance, please contact our support team. We're here to help.
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>© 2024 DineSmart</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `;

    const textContent = `Hello ${ownerName},

Your restaurant "${restaurantName}" has been successfully onboarded to DineSmart. Use the credentials below to log in and start managing your restaurant.

${paymentUrl ? `ACTION REQUIRED: Your account is pending activation. Please complete your subscription payment to access all features.

Complete Payment: ${paymentUrl}

` : ''}LOGIN CREDENTIALS

Email:    ${username}
Password: ${password}

Important: Please change your password immediately after your first login.

Login to DineSmart: ${loginUrl}/auth/login

If you have any questions or need assistance, please contact our support team. We're here to help.

© 2024 DineSmart

This is an automated message, please do not reply to this email.`;

    return { html: htmlContent, text: textContent };
}

module.exports = generateOnboardingEmail;
