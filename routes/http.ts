import type { Request } from "express";

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
