// services/session-cleanup.service.ts
import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { lt } from "drizzle-orm";
import { authSessions } from "../src/db/schema/auth-sessions";
import { db } from "../src/db/db";

class SessionCleanupService {
  private static instance: SessionCleanupService;
  private cronJob: ScheduledTask | null = null;

  private constructor() {}

  static getInstance(): SessionCleanupService {
    if (!SessionCleanupService.instance) {
      SessionCleanupService.instance = new SessionCleanupService();
    }
    return SessionCleanupService.instance;
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await db
        .delete(authSessions)
        .where(lt(authSessions.expires_at, new Date()))
        .returning({ id: authSessions.id });

      if (result.length > 0) {
        console.log(`🧹 Cleaned up ${result.length} expired sessions`);
      } else {
        console.log("✅ No expired sessions to clean up");
      }
    } catch (error) {
      console.error("❌ Error cleaning up expired sessions:", error);
      throw error;
    }
  }

  // Start the cron job
  startCronJob(schedule: string = "0 0 * * *"): void {
    if (this.cronJob) {
      console.log("⚠️ Cron job already running. Stopping existing job...");
      this.stopCronJob();
    }

    // Schedule: Default runs daily at midnight
    this.cronJob = cron.schedule(schedule, async () => {
      console.log(`🕐 Running session cleanup at ${new Date().toISOString()}`);
      await this.cleanupExpiredSessions();
    });

    console.log(
      `✅ Session cleanup cron job started with schedule: ${schedule}`,
    );
  }

  // Stop the cron job
  stopCronJob(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("🛑 Session cleanup cron job stopped");
    }
  }

  // Run cleanup once immediately
  async runOnce(): Promise<void> {
    console.log(
      `🔧 Running manual session cleanup at ${new Date().toISOString()}`,
    );
    await this.cleanupExpiredSessions();
  }
}

export const sessionCleanupService = SessionCleanupService.getInstance();
