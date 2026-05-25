import cron from "node-cron";
import { authRepository } from "../storage";

let cleanupTaskStarted = false;

export const startEmailVerificationCleanupJob = () => {
  if (cleanupTaskStarted) {
    return;
  }

  cleanupTaskStarted = true;

  cron.schedule("0 0 * * *", async () => {
    try {
      const deletedRecords = await authRepository.deleteExpiredEmailVerifications(
        new Date(),
      );

      console.info("Expired email verification cleanup completed", {
        deletedCount: deletedRecords.length,
      });
    } catch (error) {
      console.error("Expired email verification cleanup failed", { error });
    }
  });
};
