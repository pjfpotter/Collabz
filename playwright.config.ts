// Settings for Playwright, our browser tests (`npm run test:e2e`).
// Playwright opens a real Chromium browser, visits our pages and checks what
// a person would see (design decision 8).
// Docs: https://playwright.dev/docs/test-configuration
//
// Two ways to run:
// 1. Locally (normal): Playwright starts its own `next dev` pointed at the
//    TEST database, and every test runs, including ones that change data.
// 2. Against a deployed site: `BASE_URL=https://... npm run test:e2e`.
//    No local server is started, and tests that change data skip themselves,
//    because we can't (and mustn't) edit that site's database from here.

import "dotenv/config"; // load .env so TEST_DATABASE_URL is available here
import { defineConfig, devices } from "@playwright/test";

// Set when testing a deployed site, e.g. a Vercel preview URL.
const deployedUrl = process.env.BASE_URL;

// A separate port from the usual 3000, so the tests' own server never gets
// mixed up with a `npm run dev` you might already have running.
const localPort = 3100;

// When running locally the tests change data (rename/retire a tag), so, as
// with Vitest, they must only ever touch the test database.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!deployedUrl && !testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Browser tests change data, so they need " +
      "their own URL. Add it to .env (see .env.example) and use the Neon dev " +
      "branch, NEVER production. (Or set BASE_URL to test a deployed site.)",
  );
}

export default defineConfig({
  testDir: "tests/e2e",

  // After the last test, put the shared dev database back to the catalogue
  // plus the fresh pretend cohort (foundation design decision 12).
  globalTeardown: "./tests/helpers/playwrightGlobalTeardown.ts",

  // One test at a time: tests share one database, and some of them change it.
  fullyParallel: false,
  workers: 1,

  use: {
    // Lets tests write page.goto("/catalogue") instead of a full URL.
    baseURL: deployedUrl ?? `http://localhost:${localPort}`,
  },

  // Chromium only: enough to prove the page works in a real browser, and one
  // browser download instead of three.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Start the app before the tests, unless we're testing a deployed site.
  webServer: deployedUrl
    ? undefined
    : {
        command: `npx next dev --port ${localPort}`,
        url: `http://localhost:${localPort}`,
        // Values set here win over .env.
        env: {
          // Point the app at the test database.
          DATABASE_URL: testDatabaseUrl!,
          // Switch on the pretend cohort for the tests' own server, so the
          // "sign in as…" switcher is there to sign tests in with. This is
          // only ever a local server against the test database, never a
          // deployed site (see src/lib/pretendCohort.ts).
          PRETEND_COHORT: "on",
        },
        // Always start a fresh server, so we know which database it uses.
        reuseExistingServer: false,
        // The first `next dev` start compiles the app, which can be slow.
        timeout: 120_000,
      },
});
