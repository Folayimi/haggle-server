export interface AppOtpTemplateParams {
  otpCode: string;
  expiresInMinutes: number;
  supportEmail: string;
}

export const renderAppOtpTemplate = ({
  otpCode,
  expiresInMinutes,
  supportEmail,
}: AppOtpTemplateParams) => `
Your Haggle verification code is: ${otpCode}

This code expires in ${expiresInMinutes} minutes.

If you did not request this code, ignore this email or contact ${supportEmail}.
`.trim();
