// Runs once around the WHOLE Vitest run (set up in vitest.config.mts).
// Vitest calls `teardown` after the last test file has finished.

import { restoreDevData } from "./restoreDevData";

export async function teardown(): Promise<void> {
  await restoreDevData();
}
