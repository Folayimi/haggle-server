import express, { Request, Response } from "express";
import cors from "cors";
import { registerRoutes } from "./routes/routes";
import { cleanupExpiredEmailVerifications } from "./jobs/emailVerificationCleanup";
import { sessionCleanupService } from "./services/session-cleanup.service";

const app = express();

app.use(express.json());

const allowedOrigins = [
  "http://localhost:3000",
  "https://haggle.com.ng",
  "https://www.haggle.com.ng",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "haggle-api",
    environment: process.env.NODE_ENV,
  });
});

registerRoutes(app);

app.get("/internal/cron/cleanup", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return res.status(500).json({
      success: false,
      message: "Cron secret is not configured",
    });
  }

  if (req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const emailDeleted = await cleanupExpiredEmailVerifications();

    await sessionCleanupService.runOnce();

    return res.json({
      success: true,
      message: "Haggle cleanup completed",
      emailVerificationsDeleted: emailDeleted,
    });
  } catch (error) {
    console.error("Scheduled cleanup failed:", error);

    return res.status(500).json({
      success: false,
      message: "Cleanup failed",
    });
  }
});

export = app;
