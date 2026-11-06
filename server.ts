import "dotenv/config";

import app from "./index";

import { startEmailVerificationCleanupJob } from "./jobs/emailVerificationCleanup";
import { sessionCleanupService } from "./services/session-cleanup.service";

const PORT = process.env.PORT || 5000;

// Local development only
sessionCleanupService.startCronJob("0 2 * * *");
startEmailVerificationCleanupJob();

app.listen(PORT, () => {
  console.log(`Haggle API running on http://localhost:${PORT}`);
});
