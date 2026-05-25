export interface WebVerificationTemplateParams {
  verificationUrl: string;
  expiresInMinutes: number;
  supportEmail: string;
}

export const renderWebVerificationTemplate = ({
  verificationUrl,
  expiresInMinutes,
  supportEmail,
}: WebVerificationTemplateParams) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Haggle Email</title>
  </head>
  <body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:32px 24px;color:#ffffff;">
                <h1 style="margin:0;font-size:28px;line-height:1.2;">Confirm your Haggle email</h1>
                <p style="margin:12px 0 0;font-size:16px;line-height:1.6;">
                  Finish setting up your account by confirming this email address.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px;">
                <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
                  Click the button below to verify your email. This link expires in
                  <strong>${expiresInMinutes} minutes</strong>.
                </p>
                <p style="margin:0 0 28px;">
                  <a
                    href="${verificationUrl}"
                    style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:700;"
                  >
                    Verify Email
                  </a>
                </p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4b5563;">
                  If the button does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.7;word-break:break-all;">
                  <a href="${verificationUrl}" style="color:#b45309;">${verificationUrl}</a>
                </p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
                  If you did not request this, you can ignore this email or contact
                  <a href="mailto:${supportEmail}" style="color:#b45309;">${supportEmail}</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
