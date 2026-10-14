// Two small decisions behind getCurrentUser() (slice 1, #8).
//
// getCurrentUser() in src/lib/currentUser.ts gathers the facts (is there a
// real Auth.js session? has the dev switcher picked a pretend user?) and
// these functions make the decision. They are kept apart from it because
// getCurrentUser() needs a real browser request with cookies, while these
// plain functions can be tested with made-up users in a fraction of a second.
//
// Owner: slice 1 (#8).

import type { User } from "@/generated/prisma/client";

// The only parts of a User these decisions look at. Using a smaller type
// means the tests can make a user from just these fields.
type AccountFields = Pick<User, "courseId" | "acceptedTermsAt" | "suspendedAt">;

// Has this person finished signing up?
//
// Auth.js creates the User row the moment someone opens a magic link, before
// we know their course or whether they've accepted the terms. The user-auth
// spec says such an account doesn't count as created until both are filled
// in ("An unfinished account can't use the app").
export function isAccountFinished(
  user: Pick<User, "courseId" | "acceptedTermsAt">,
): boolean {
  return user.courseId !== null && user.acceptedTermsAt !== null;
}

// Who should the app treat as signed in? (design decision 4)
//
// - sessionUser: the person from a real Auth.js session, or null.
// - pretendUser: the person picked in the dev "sign in as…" switcher, or
//   null. The foundation's findPretendUser() already returns null wherever
//   the pretend cohort is off (always on production), so we don't check
//   that again here.
//
// The rules, in order:
// 1. A real session wins. Its person is returned only if they have finished
//    signing up and aren't suspended. Otherwise: nobody. We deliberately do
//    NOT fall back to the switcher here: someone who really signed in should
//    never be silently swapped for a pretend user.
// 2. No real session: the switcher's pretend user, if any. Suspended pretend
//    users ARE returned, so a teammate can act as the suspended pretend user
//    to check they vanish from the graph (foundation #7). Only real sign-ins
//    are refused for being suspended.
// 3. Otherwise: nobody.
//
// It is generic (<T>) so that whatever type of user goes in comes back out,
// e.g. a full User row from getCurrentUser().
export function pickCurrentUser<T extends AccountFields>(people: {
  sessionUser: T | null;
  pretendUser: T | null;
}): T | null {
  const { sessionUser, pretendUser } = people;

  if (sessionUser) {
    const isSuspended = sessionUser.suspendedAt !== null;
    if (isAccountFinished(sessionUser) && !isSuspended) {
      return sessionUser;
    }
    return null;
  }

  return pretendUser;
}
