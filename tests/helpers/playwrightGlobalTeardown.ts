// Runs once after ALL the Playwright browser tests (set up in
// playwright.config.ts).

import { restoreDevData } from "./restoreDevData";

export default async function globalTeardown(): Promise<void> {
  // With BASE_URL set we are testing a deployed site, and never touched a
  // database from here, so there is nothing to put back.
  if (process.env.BASE_URL) {
    return;
  }
  await restoreDevData();
}
