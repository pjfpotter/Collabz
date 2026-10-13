// "Has someone really signed in with a magic link, and who?" (slice 1, #8).
//
// This returns the person behind a real Auth.js session, EXACTLY as their
// User row is now, whether or not they've finished signing up and whether or
// not they're suspended. Most of the app should NOT use it: other tracks call
// getCurrentUser() (src/lib/currentUser.ts), which only returns people who
// may use the app.
//
// Slice 1's own pages need the unfiltered answer, because they're the ones
// that deal with unfinished accounts: /signin sends an unfinished person on
// to /signup/finish, and /signup/finish saves their course and terms.
//
// Owner: slice 1 (#8).

import { auth } from "@/auth";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function getSessionUser(): Promise<User | null> {
  // auth() reads the session cookie and looks the session up in the
  // database. No cookie, or an expired session, gives null.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  // Load the full row (see the session callback in src/auth.ts for why we
  // don't trust a copy stored on the session).
  return prisma.user.findUnique({ where: { id: userId } });
}
