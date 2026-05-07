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
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/catalog", catalogRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/offers", offersRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/trust", trustRouter);
  app.use("/api/webrtc", webrtcRouter);
};
