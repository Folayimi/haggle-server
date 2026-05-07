import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  // driver: 'pg',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
