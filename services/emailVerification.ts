import jwt from "jsonwebtoken";
import { EmailVerificationType } from "../src/db/schema";

export const EMAIL_VERIFICATION_EXPIRY_MINUTES =  144; // 24 hours in minutes
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

interface VerificationJwtPayload {
  email: string;
  sub: string;
  type: typeof EmailVerificationType.WEB_LINK;
}

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }

  return value;
};

export const getVerificationExpiryDate = () =>
  new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

export const getRateLimitWindowMs = () => {
  const rawValue = process.env.RATE_LIMIT_WINDOW_MS;
  if (!rawValue) {
    return DEFAULT_RATE_LIMIT_WINDOW_MS;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsedValue) ? DEFAULT_RATE_LIMIT_WINDOW_MS : parsedValue;
};

export const generateSixDigitOtp = () =>
  `${Math.floor(100000 + Math.random() * 900000)}`;

export const generateVerificationJwt = (userId: string, email: string) =>
  jwt.sign(
    {
      email,
      type: EmailVerificationType.WEB_LINK,
    },
    getRequiredEnv("JWT_SECRET"),
    {
      expiresIn: `${EMAIL_VERIFICATION_EXPIRY_MINUTES}m`,
      subject: userId,
    },
  );

export const verifyVerificationJwt = (token: string) =>
  jwt.verify(token, getRequiredEnv("JWT_SECRET")) as VerificationJwtPayload &
    jwt.JwtPayload;

export const buildVerificationUrl = (token: string) => {
  const baseUrl = getRequiredEnv("FRONTEND_URL").replace(/\/$/, "");
  return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
};
