// Puts the shared dev database back into its known state after a test run:
// the tag catalogue plus the fresh pretend cohort.
//
// WHY THIS EXISTS: tests and hand-testing share ONE database (the Neon dev
// branch; Patrick's decision, 8 Oct 2026). Tests empty every table, which
// would leave the pretend cohort deleted for whoever opens the app next. So
// each test run ends by loading it again, here, in one place. Individual test
// files don't need to restore anything themselves.
//
// The cost, which the README warns about: anything changed by hand on dev
// (a request you approved, a message you sent) is reset by any test run.
//
// Called by Vitest (tests/helpers/vitestGlobalSetup.ts) and by Playwright
// (tests/helpers/playwrightGlobalTeardown.ts).

import { seedCatalogue } from "../../prisma/seed";
import { seedPretendCohort } from "../../prisma/seed-fake";
import { isPretendCohortEnabled } from "../../src/lib/pretendCohort";
import { createTestDatabaseClient, emptyDatabase } from "./database";

export async function restoreDevData(): Promise<void> {
  const prisma = createTestDatabaseClient();

  try {
    // Start from empty so that leftovers from the last test file (changed
    // names, test-only users) are gone, then load the two seeds in order:
    // the pretend cohort is built from the catalogue, so that goes first.
    await emptyDatabase(prisma);
    await seedCatalogue(prisma);

    if (isPretendCohortEnabled()) {
      await seedPretendCohort(prisma);
    } else {
      // We deliberately don't switch it on ourselves: the switch is meant to
      // be a decision a person made (see src/lib/pretendCohort.ts).
      console.warn(
        "\nNote: the pretend cohort was NOT restored after the tests, because " +
          'PRETEND_COHORT="on" is missing from your .env. The dev database ' +
          "now only has the tag catalogue. Add the line, then run " +
          "`npm run seed:fake`.\n",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
