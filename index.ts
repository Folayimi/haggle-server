import "dotenv/config";
import express, { Request, Response } from "express";
import { startEmailVerificationCleanupJob } from "./jobs/emailVerificationCleanup";
import { registerRoutes } from "./routes/routes";
import cors from "cors";
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Register all routes
registerRoutes(app);
startEmailVerificationCleanupJob();

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
