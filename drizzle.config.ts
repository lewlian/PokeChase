import { defineConfig } from "drizzle-kit";

// Same resolution as src/db/index.ts — env override for hosted deploys.
const DB_URL = process.env.POKECHASE_DB_PATH ?? "./data/pokechase.db";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: DB_URL },
});
