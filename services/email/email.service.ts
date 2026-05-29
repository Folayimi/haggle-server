import nodemailer from "nodemailer";
import { renderAppOtpTemplate } from "./templates/appOtpTemplate";
import { renderWebVerificationTemplate } from "./templates/webVerificationTemplate";

const DEFAULT_RESEND_PORT = 465;
const DEFAULT_SMTP_PORT = 587;
const EMAIL_RETRY_ATTEMPTS = 3;
const EMAIL_RETRY_BASE_DELAY_MS = 500;

interface EmailPayload {
  html?: string;
  subject: string;
  text?: string;
  to: string;
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

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }

  return value;
};

const getEmailPort = () => {
  if (process.env.EMAIL_PORT) {
    const parsedPort = Number.parseInt(process.env.EMAIL_PORT, 10);
    if (!Number.isNaN(parsedPort)) {
      return parsedPort;
    }
  }

  return process.env.EMAIL_HOST?.includes("resend.com")
    ? DEFAULT_RESEND_PORT
    : DEFAULT_SMTP_PORT;
};

const getEmailTransport = () =>
  nodemailer.createTransport({
    auth: {
      pass: getRequiredEnv("EMAIL_PASS"),
      user: getRequiredEnv("EMAIL_USER"),
    },
    host: getRequiredEnv("EMAIL_HOST"),
    port: getEmailPort(),
    secure: getEmailPort() === 465,
  });

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isProduction = process.env.NODE_ENV === "production";

export const maskSensitiveValue = (value: string) => {
  if (!value) {
    return value;
  }

  if (!isProduction) {
    return value;
  }

  if (value.length <= 4) {
    return `${value[0] ?? ""}***`;
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

const logEmailAttempt = (payload: EmailPayload, attempt: number) => {
  console.info("Sending verification email", {
    attempt,
    subject: payload.subject,
    to: payload.to,
  });
};

const sendEmailWithRetry = async (payload: EmailPayload) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= EMAIL_RETRY_ATTEMPTS; attempt += 1) {
    try {
      logEmailAttempt(payload, attempt);

      const transporter = getEmailTransport();
      const fromAddress =
        process.env.EMAIL_FROM ||
        `"Haggle Team" <${getRequiredEnv("EMAIL_USER")}>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        html: payload.html,
        subject: payload.subject,
        text: payload.text,
        to: payload.to,
      });

      console.info("Verification email sent", {
        messageId: info.messageId,
        response: info.response,
        to: payload.to,
      });

      return info;
    } catch (error) {
      lastError = error;
      console.error("Verification email send failed", {
        attempt,
        error,
        subject: payload.subject,
        to: payload.to,
      });

      if (attempt < EMAIL_RETRY_ATTEMPTS) {
        await sleep(EMAIL_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError ?? new Error("Failed to send email");
};

export const sendWebVerificationEmail = async ({
  email,
  expiresInMinutes,
  supportEmail,
  verificationUrl,
}: WebVerificationEmailParams) =>
  sendEmailWithRetry({
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
}: AppOtpEmailParams) => {
  console.info("Preparing OTP email", {
    codePreview: maskSensitiveValue(otpCode),
    email,
  });

  return sendEmailWithRetry({
    subject: "Your Haggle verification code",
    text: renderAppOtpTemplate({
      expiresInMinutes,
      otpCode,
      supportEmail,
    }),
    to: email,
  });
};
