// Recalculates EVERY chemistry score from scratch: `npm run rescore:all`.
// (Slice 3, #10, task 7.1, design decision 10.)
//
// WHEN TO RUN IT:
//   - Once after this slice lands, so the pretend cohort's INVENTED scores
//     (written by `npm run seed:fake`) are replaced by real calculated ones.
//   - Any time the Seeking -> Quality pairings are edited, because every score
//     depends on them.
//
// HOW IT WORKS: it asks for every eligible person (finished profile, not
// suspended) and calls scoreUser() for each, one after another. scoreUser()
// is the same shared helper the app uses, so this script can never disagree
// with the app about what a score is.
//
// WHY ONE AT A TIME and not all at once: each call is its own database
// transaction. Running them in parallel could open many connections at the
// same moment, which Neon's free tier may refuse. A cohort is 30 to 100
// people, so doing them in a row still takes only seconds.
//
// IT IS SAFE TO RUN TWICE: scoreUser() deletes a person's old rows and writes
// the new ones, so a second run gives the same rows (a glitch match that is
// still valid is kept, not re-rolled).
//
// SECRETS: it prints counts only. It never prints DATABASE_URL, and on a
// failure it prints the error's name rather than its message, because
// connection errors can contain the database address.

// Loads .env when run on a laptop.
import "dotenv/config";

import { prisma } from "../src/lib/db";
import { getEligiblePeople } from "../src/lib/matching/eligiblePeople";
import { scoreUser } from "../src/lib/scoring";

async function main(): Promise<void> {
  const people = await getEligiblePeople();
  console.log(`Rescoring ${people.length} eligible people...`);

  for (const person of people) {
    await scoreUser(person.userId);
  }

  // Counts after the run, so a person can see it did something sensible.
  // With N eligible people there should be N * (N - 1) / 2 edges: one row per
  // pair, not one per direction (src/lib/userPair.ts).
  const edgeCount = await prisma.edge.count();
  const glitchMatchCount = await prisma.glitchMatch.count();

  console.log("Done.");
  console.log(`  People rescored:  ${people.length}`);
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
