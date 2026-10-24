import type { Request } from "express";
import { verifyAccessToken } from "../services/tokenService";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

/** Resolve identity only from a signed access token, never from caller supplied IDs. */
export const getBearerUserId = (req: Request): string | null => {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  try {
    const { userId } = verifyAccessToken(authorization.slice(7));
    return isUuid(userId) ? userId : null;
  } catch {
    return null;
  }
};

export const getRequestUserId = (req: Request) => {
  const headerValue = req.header("x-user-id");
  if (headerValue) {
    return headerValue;
  }

  const bodyUserId =
    typeof req.body === "object" && req.body !== null && "userId" in req.body
      ? req.body.userId
      : undefined;

  if (typeof bodyUserId === "string") {
    return bodyUserId;
  }

  const queryUserId = req.query.userId;
  return typeof queryUserId === "string" ? queryUserId : undefined;
};
