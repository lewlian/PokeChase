import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" throws outside a React Server context; tests exercise
      // query modules directly, so stub it out.
      "server-only": path.resolve(__dirname, "tests/helpers/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // DB-backed suites import drizzle-orm's large ESM graph; first (uncached)
    // transform can exceed the default 10s hook timeout.
    hookTimeout: 30_000,
  },
});
