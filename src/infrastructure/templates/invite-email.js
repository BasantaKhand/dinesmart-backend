function escapeHtml(value = '') {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function generateInviteEmail({ ownerName, restaurantName, inviteUrl, expiresAt, customMessage }) {
    const expiryText = new Date(expiresAt).toLocaleString();
    const safeMessage = customMessage ? escapeHtml(customMessage) : '';
    const htmlMessage = safeMessage ? safeMessage.replace(/\n/g, '<br/>') : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DineSmart Demo Invite</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            color: #3a3a3a;
            background: #ffffff;
        }
        .container {
            max-width: 520px;
            margin: 0;
            padding: 24px;
        }
        .brand {
            font-weight: 700;
            font-size: 16px;
            margin-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 12px;
        }
        .title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 12px;
            color: #18181b;
        }
        .text {
            font-size: 14px;
            line-height: 1.7;
            color: #52525b;
            margin-bottom: 16px;
        }
        .cta {
            display: inline-block;
            background: #FF5C00;
            color: #ffffff !important;
            text-decoration: none;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            margin: 8px 0 12px;
        }
        .meta {
            font-size: 12px;
            color: #71717a;
            margin-top: 10px;
        }
        .footer {
            margin-top: 24px;
            padding-top: 14px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #71717a;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="brand">DineSmart</div>
        <div class="title">Your onboarding invite is ready</div>
        <p class="text">Hi ${ownerName},</p>
        <p class="text">Thanks for attending the demo. Your invite for <strong>${restaurantName}</strong> is ready. Use the link below to activate your owner account, set your password, and complete onboarding.</p>
        <a href="${inviteUrl}" class="cta">Activate account</a>
        <p class="meta">Invite expires on: ${expiryText}</p>
        ${htmlMessage ? `<p class="text">${htmlMessage}</p>` : ''}
        <p class="text">If the button doesn't work, copy and paste this URL into your browser:<br/>${inviteUrl}</p>
        <div class="footer">This is an automated message from DineSmart.</div>
    </div>
</body>
</html>
    `;

    const text = `Hi ${ownerName},

Thanks for attending the demo. Your invite for ${restaurantName} is ready.
Use this link to activate your owner account, set your password, and complete onboarding:

${inviteUrl}

Invite expires on: ${expiryText}

${customMessage ? `${customMessage}\n` : ''}

This is an automated message from DineSmart.`;

    return { html, text };
}

module.exports = generateInviteEmail;
