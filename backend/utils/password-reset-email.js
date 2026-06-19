/**
 * Branded HTML emails for password reset flows.
 */

const APP_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI";
const BRAND_COLOR = process.env.NEXT_PUBLIC_BRAND_COLOR || "#7c3aed";
const { getAppUrl } = require("./app-url");

function emailShell({ preheader, title, bodyHtml, footerNote }) {
  const APP_URL = getAppUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#eef2ff 0%,#faf5ff 50%,#fdf2f8 100%);padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(79,70,229,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR},#a855f7);padding:28px 32px;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;border-radius:14px;background:rgba(255,255,255,0.2);line-height:48px;font-size:22px;font-weight:800;color:#fff;">${APP_NAME.slice(0, 1).toUpperCase()}</div>
              <h1 style="margin:14px 0 0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.02em;">${APP_NAME}</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.88);">Secure account recovery</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
                ${footerNote || "If you didn't request this, you can safely ignore this email."}
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#cbd5e1;text-align:center;">
                © ${new Date().getFullYear()} ${APP_NAME} · <a href="${APP_URL}/privacy" style="color:#94a3b8;">Privacy</a> · <a href="${APP_URL}/terms" style="color:#94a3b8;">Terms</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetEmail({ name, email, resetUrl, otp, expiresMinutes = 15 }) {
  const APP_URL = getAppUrl();
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const resetPageUrl = `${APP_URL}/auth/reset-password?email=${encodeURIComponent(email || "")}`;
  const bodyHtml = `
    <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">Reset your password</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">${greeting}<br/>We received a request to reset your ${APP_NAME} password. Choose one of the options below — both expire in <strong>${expiresMinutes} minutes</strong>.</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
      <tr>
        <td style="padding:20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Option 1 — One-click link</p>
          <a href="${resetUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;box-shadow:0 8px 20px rgba(124,58,237,0.35);">Reset Password</a>
          <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">${resetUrl}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:14px;">
      <tr>
        <td style="padding:20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">Option 2 — Verification code</p>
          <div style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:0.35em;color:#5b21b6;padding:12px 20px;background:#fff;border-radius:12px;border:2px dashed #c4b5fd;">${otp}</div>
          <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Enter this code on the reset page with your new password.</p>
          <a href="${resetPageUrl}" style="display:inline-block;margin-top:10px;font-size:13px;color:${BRAND_COLOR};font-weight:600;">Open reset page →</a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#9a3412;"><strong>Security tip:</strong> Never share this code or link. ${APP_NAME} will never ask for your password by email.</p>
        </td>
      </tr>
    </table>`;

  return emailShell({
    preheader: `Your ${APP_NAME} password reset code is ${otp}. Link and code expire in ${expiresMinutes} minutes.`,
    title: `Reset your ${APP_NAME} password`,
    bodyHtml,
  });
}

function buildPasswordChangedEmail({ name }) {
  const APP_URL = getAppUrl();
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const bodyHtml = `
    <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">Password updated successfully</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">${greeting}<br/>Your ${APP_NAME} password was changed just now. You can sign in with your new password.</p>
    <a href="${APP_URL}/login" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;">Sign in to ${APP_NAME}</a>
    <p style="margin:20px 0 0;font-size:13px;color:#ef4444;">Didn't make this change? Contact support immediately and secure your account.</p>`;

  return emailShell({
    preheader: `Your ${APP_NAME} password was changed.`,
    title: `Password changed — ${APP_NAME}`,
    bodyHtml,
    footerNote: "This is a security notification. No action needed if you made this change.",
  });
}

module.exports = { buildPasswordResetEmail, buildPasswordChangedEmail, buildLoginOtpEmail };

function buildLoginOtpEmail({ name, otp, expiresMinutes = 10 }) {
  const APP_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI";
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const bodyHtml = `
    <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">Your sign-in verification code</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">${greeting}<br/>Use this code to complete your ${APP_NAME} login. It expires in <strong>${expiresMinutes} minutes</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:14px;">
      <tr>
        <td style="padding:24px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">Verification code</p>
          <div style="display:inline-block;font-size:36px;font-weight:800;letter-spacing:0.35em;color:#5b21b6;padding:14px 24px;background:#fff;border-radius:12px;border:2px dashed #c4b5fd;">${otp}</div>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#64748b;">If you didn't try to sign in, you can ignore this email.</p>`;

  return emailShell({
    preheader: `Your ${APP_NAME} login code is ${otp}. Expires in ${expiresMinutes} minutes.`,
    title: `Sign in to ${APP_NAME}`,
    bodyHtml,
    footerNote: "Never share this code with anyone.",
  });
}
