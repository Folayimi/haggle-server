import jwt from "jsonwebtoken";
import { db } from "../src/db/db";
import { authSessions } from "../src/db/schema/auth-sessions";
import { eq, and, isNull, lt } from "drizzle-orm";
import { config } from "dotenv";
import { userSessions } from "../src/db/schema";

config({ path: ".env" });

// Types
interface TokenPayload {
  userId: string;
  type: "access" | "refresh" | "reset";
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface ResetToken {
  resetToken: string;
}

// Validate required environment variables on startup
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const RESET_TOKEN_EXPIRY = process.env.RESET_TOKEN_EXPIRY || "15m";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    "Missing required environment variables: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined",
  );
}

// Warn if using default expiry values in production
if (process.env.NODE_ENV === "production") {
  if (ACCESS_TOKEN_EXPIRY === "15m" && !process.env.ACCESS_TOKEN_EXPIRY) {
    console.warn("Warning: ACCESS_TOKEN_EXPIRY not set, using default 15m");
  }
  if (REFRESH_TOKEN_EXPIRY === "7d" && !process.env.REFRESH_TOKEN_EXPIRY) {
    console.warn("Warning: REFRESH_TOKEN_EXPIRY not set, using default 7d");
  }
}

// Generate tokens
export const generateTokens = (userId: string): Tokens => {
  // Changed: userId must be string, not undefined
  const accessToken = jwt.sign({ userId, type: "access" }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
  });

  const refreshToken = jwt.sign(
    { userId, type: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] },
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
    if (decoded.type !== "access") {
      throw new Error("Invalid token type");
    }
    return { userId: decoded.userId };
  } catch (error) {
    throw error;
  }
};

export const generateResetToken = (userId: string): ResetToken => {
  // Changed: userId must be string, not undefined
  const resetToken = jwt.sign({ userId, type: "reset" }, JWT_ACCESS_SECRET, {
    expiresIn: RESET_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
  });
  return { resetToken };
};

export const verifyResetToken = async (
  token: string,
): Promise<{ userId: string }> => {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
    if (decoded.type !== "reset") {
      throw new Error("Invalid token type");
    }
    const [session] = await db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.reset_token, token),
          eq(authSessions.user_id, decoded.userId),
          isNull(authSessions.revoked_at),
        ),
      )
      .limit(1);

    if (!session) {
      throw new Error("Invalid token");
    }

    if (new Date() > session.expires_at) {
      throw new Error("Auth Session expired");
    }

    return { userId: decoded.userId };
  } catch (error) {
    throw error;
  }
};

// Verify refresh token
export const verifyUserRefreshToken = async (
  refreshToken: string,
): Promise<{ userId: string; sessionId: string }> => {
  try {
    const decoded = jwt.verify(
      refreshToken,
      JWT_REFRESH_SECRET,
    ) as TokenPayload;

    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.refresh_token, refreshToken),
          eq(userSessions.user_id, decoded.userId),
          isNull(userSessions.revoked_at),
        ),
      )
      .limit(1);

    if (!session) {
      throw new Error("Invalid session");
    }

    if (new Date() > session.expires_at) {
      throw new Error("Session expired");
    }

    return {
      userId: decoded.userId,
      sessionId: session.id,
    };
  } catch (error) {
    throw error;
  }
};

// Revoke session (logout)
export const revokeUserSession = async (
  refreshToken: string,
): Promise<void> => {
  await db
    .update(userSessions)
    .set({ revoked_at: new Date() })
    .where(eq(userSessions.refresh_token, refreshToken));
};

// Revoke all user sessions
export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  await db
    .update(authSessions)
    .set({ revoked_at: new Date() })
    .where(eq(authSessions.user_id, userId));
};

// Clean up expired sessions (run via cron job)
export const cleanupExpiredSessions = async (): Promise<void> => {
  await db.delete(authSessions).where(lt(authSessions.expires_at, new Date()));
};
