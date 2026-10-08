// Settings for Vitest, our unit/integration test runner (`npm test`).
// The .mts ending tells Node this file uses modern `import` syntax, which
// the next major version of Vite will require for config files.
// Docs: https://vitest.dev/config/
//
// Tests run against a REAL database, never a mock: proving Prisma and Neon
// work together is the point of slice 0 (design decision 8).

import "dotenv/config"; // load .env so TEST_DATABASE_URL is available here
import path from "node:path";
import { defineConfig } from "vitest/config";

// Tests EMPTY every table. So they must only ever run against a
// database meant for that. We read a variable that only tests use, and stop
// straight away if it's missing, rather than falling back to DATABASE_URL,
// which on some machine might one day be production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Tests empty the database tables, so they " +
      "need their own URL. Add it to .env (see .env.example) and use the Neon " +
      "dev branch, NEVER production.",
  );
}

export default defineConfig({
  resolve: {
    // Teach Vitest the "@/..." import shortcut that tsconfig.json defines,
    // so tests can import app code the same way the app does.
    // import.meta.dirname is the folder this file is in (the repo root).
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    // Only our Vitest files. Playwright's browser tests live in tests/e2e
    // and are run separately by `npm run test:e2e`.
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],

    // After the last test file, put the shared dev database back to the
    // catalogue plus the fresh pretend cohort (foundation design decision 12).
    globalSetup: ["tests/helpers/vitestGlobalSetup.ts"],

    // Point the app's database client (src/lib/db.ts reads DATABASE_URL) at
    // the test database for the whole test run.
    env: { DATABASE_URL: testDatabaseUrl },

    // Run test files one at a time. They all share one database, so two
    // files emptying and refilling it at the same moment would trip each
    // other up.
    fileParallelism: false,

    // Real database calls over the internet can take a few seconds,
    // especially the first one after Neon has been idle and wakes up.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
