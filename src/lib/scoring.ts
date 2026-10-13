// Chemistry scoring - the shared entry point.
//
// SHARED HELPER. Other tracks call scoreUser() and never look inside.

import { rescoreUser } from "@/lib/matching/rescoreUser";

// Recalculates every chemistry score that involves one user.
//
// WHAT IT DOES: deletes that user's rows in the Edge table, scores them again
// against everyone with a finished profile, and writes the new rows. It also
// gives them a glitch match if they don't have one, and replaces any glitch
// match (theirs or anyone else's) that has stopped being valid. Nobody else's
// scores change (see openspec/specs/chemistry-matching/spec.md). All of it
// happens in one database transaction, so it is all-or-nothing.
//
// A user who has not finished their profile, or is suspended, ends up with no
// scores and no glitch match, and so is in nobody's top 5.
//
// When to call it: after a user finishes onboarding, and after every saved
// edit to their answers. Call it AFTER your own save has succeeded, so a
// scoring problem can never undo the user's own work. Also call it after an
// admin suspends someone or resets their onboarding, so they drop out.
//
// Why it is `async`: it talks to the database, so callers must `await` it.
//
// The real work is in src/lib/matching/rescoreUser.ts. It is kept there so
// the glitch match's random choice can be made repeatable in tests, while
// this function keeps its one-argument shape for every caller.
//
// Owner: foundation (#7) wrote the stand-in, slice 3 (#10) filled it in.
export async function scoreUser(userId: string): Promise<void> {
  await rescoreUser(userId);
}
