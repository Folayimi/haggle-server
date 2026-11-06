import { Resend } from "resend";
import { config } from "dotenv";
import { renderAppOtpTemplate } from "./templates/appOtpTemplate";
import { renderWebVerificationTemplate } from "./templates/webVerificationTemplate";

config({ path: ".env" });

interface EmailPayload {
  html?: string;
  subject: string;
  text?: string;
  to: string;
}

interface ResendEmailResult {
  id: string;
}

interface VerificationEmailParams {
  email: string;
  expiresInMinutes: number;
  supportEmail: string;
}

export interface WebVerificationEmailParams extends VerificationEmailParams {
  verificationUrl: string;
}

export interface AppOtpEmailParams extends VerificationEmailParams {
  otpCode: string;
}

let resendClient: Resend | undefined;

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }

  return value;
};

const getResendClient = (): Resend => {
  if (!resendClient) {
    resendClient = new Resend(getRequiredEnv("RESEND_API_KEY"));
  }

  return resendClient;
};

const getFromAddress = (): string => getRequiredEnv("EMAIL_FROM");

const getReplyToAddress = (): string | undefined =>
  process.env.EMAIL_REPLY_TO?.trim() || undefined;

const isProduction = process.env.NODE_ENV === "production";

export const maskSensitiveValue = (value: string): string => {
  if (!value || !isProduction) {
    return value;
  }

  if (value.length <= 4) {
    return `${value[0] ?? ""}***`;
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

const sendEmail = async (payload: EmailPayload): Promise<ResendEmailResult> => {
  if (!payload.to.trim()) {
    throw new Error("Email recipient is required");
  }

  console.info("Sending email through Resend", {
    subject: payload.subject,
    to: payload.to,
  });

  const replyTo = getReplyToAddress();

  const baseEmailData = {
    from: getFromAddress(),
    to: [payload.to],
    subject: payload.subject,
    ...(replyTo ? { replyTo } : {}),
  };

  const emailData = payload.html
    ? {
        ...baseEmailData,
        html: payload.html,
        ...(payload.text ? { text: payload.text } : {}),
      }
    : {
        ...baseEmailData,
        text: payload.text ?? "",
      };

  const { data, error } = await getResendClient().emails.send(emailData);

  if (error) {
    console.error("Resend email request failed", {
      errorName: error.name,
      errorMessage: error.message,
      subject: payload.subject,
      to: payload.to,
    });

    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.info("Email accepted by Resend", {
    emailId: data?.id,
    subject: payload.subject,
    to: payload.to,
  });

  if (!data?.id) {
    throw new Error(
      "Resend accepted the request without returning an email ID",
    );
  }

  return data;
};

export const sendWebVerificationEmail = async ({
  email,
  expiresInMinutes,
  supportEmail,
  verificationUrl,
}: WebVerificationEmailParams) =>
  sendEmail({
    html: renderWebVerificationTemplate({
      expiresInMinutes,
      supportEmail,
      verificationUrl,
    }),
    subject: "Verify your Haggle email",
    text: `Verify your Haggle email by visiting ${verificationUrl}. This link expires in ${expiresInMinutes} minutes. If you need help, contact ${supportEmail}.`,
    to: email,
  });

export const sendAppOtpEmail = async ({
  email,
  expiresInMinutes,
  otpCode,
  supportEmail,
}: AppOtpEmailParams) =>
  sendEmail({
    subject: "Your Haggle verification code",
    text: renderAppOtpTemplate({
      expiresInMinutes,
      otpCode,
      supportEmail,
    }),
    to: email,
  });
