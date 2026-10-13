// Recalculates EVERY chemistry score from scratch: `npm run rescore:all`.
// (Slice 3, #10, task 7.1, design decision 10.)
//
// WHEN TO RUN IT:
//   - Once after this slice lands, so the pretend cohort's INVENTED scores
//     (written by `npm run seed:fake`) are replaced by real calculated ones.
//   - Any time the Seeking -> Quality pairings are edited, because every score
//     depends on them.
//
// HOW IT WORKS: rescoreEveryone() (src/lib/matching/rescoreUser.ts) takes
// every eligible person (finished profile, not suspended), scores every pair
// with the same formula scoreUser() uses, and writes the lot in ONE
// transaction. One transaction means a failure halfway leaves the old scores
// untouched, and it is much faster than 30 separate round trips to Neon.
//
// IT IS SAFE TO RUN TWICE: the old rows are deleted and the same values are
// written back (a glitch match that is still valid is kept, not re-rolled).
//
// SECRETS: it prints counts only. It never prints DATABASE_URL, and on a
// failure it prints the error's name rather than its message, because
// connection errors can contain the database address.

// Loads .env when run on a laptop.
import "dotenv/config";

import { prisma } from "../src/lib/db";
import { rescoreEveryone } from "../src/lib/matching/rescoreUser";

async function main(): Promise<void> {
  console.log("Rescoring everyone...");
  const peopleScored = await rescoreEveryone();

  // Counts after the run, so a person can see it did something sensible.
  // With N eligible people there should be N * (N - 1) / 2 edges: one row per
  // pair, not one per direction (src/lib/userPair.ts).
  const edgeCount = await prisma.edge.count();
  const glitchMatchCount = await prisma.glitchMatch.count();

  console.log("Done.");
  console.log(`  People rescored:  ${peopleScored}`);
  console.log(`  Edges now stored: ${edgeCount}`);
  console.log(`  Glitch matches:   ${glitchMatchCount}`);
}

main()
  .catch((error: unknown) => {
    // Name only, never the message (see SECRETS above).
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error(`Rescore failed (${name}). Check DATABASE_URL is set in .env.`);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Without this the open database connection keeps the script from exiting.
    await prisma.$disconnect();
  });
