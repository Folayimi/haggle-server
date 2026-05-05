import type { Express } from "express";
import usersRouter from "./users";
import postsRouter from "./posts";

export const registerRoutes = (app: Express) => {
  app.use("/users", usersRouter);
  app.use("/posts", postsRouter);
};
