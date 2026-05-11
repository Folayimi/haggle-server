import type { Express } from "express";
import authRouter from "./auth";
import catalogRouter from "./catalog";
import conversationsRouter from "./conversations";
import notificationsRouter from "./notifications";
import offersRouter from "./offers";
import ordersRouter from "./orders";
import sessionsRouter from "./sessions";
import trustRouter from "./trust";
import usersRouter from "./users";
import webrtcRouter from "./webrtc";

export const registerRoutes = (app: Express) => {
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/catalog", catalogRouter);
  app.use("/api/v1/sessions", sessionsRouter);
  app.use("/api/v1/offers", offersRouter);
  app.use("/api/v1/conversations", conversationsRouter);
  app.use("/api/v1/orders", ordersRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/trust", trustRouter);
  app.use("/api/v1/webrtc", webrtcRouter);
};
