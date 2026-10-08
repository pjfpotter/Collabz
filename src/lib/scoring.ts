// Chemistry scoring - the shared entry point.
//
// SHARED HELPER. Other tracks call scoreUser() and never look inside.

// Recalculates every chemistry score that involves one user.
//
// NOW: does nothing. It exists so that onboarding (slice 2) and account
// editing (slice 7) can already call it in the right places.
//
// LATER: slice 3 (#10) fills it in. It will delete that user's rows in the
// Edge table, score them again against everyone with a finished profile,
// and give them a glitch match if they don't have one. Nobody else's scores
// change (see openspec/specs/chemistry-matching/spec.md).
//
// When to call it: after a user finishes onboarding, and after every saved
// edit to their answers. Call it AFTER your own save has succeeded, so a
// scoring problem can never undo the user's own work.
//
// Why it is already `async` although it does nothing: the real version talks
// to the database. If it were a plain function today, every caller would
// have to be changed to `await` it later.
//
// Owner: foundation (#7) now, slice 3 (#10) afterwards.
export async function scoreUser(userId: string): Promise<void> {
  // `void` just tells the linter we know userId isn't used yet.
  void userId;
}
