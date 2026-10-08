// "Who is using the app right now?" - the shared answer for every track.
//
// SHARED HELPERS. Every track calls these instead of working out the
// signed-in user for itself. That way, when real sign-in arrives, only the
// inside of this file changes and no page has to be touched.

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import type { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  DEV_USER_COOKIE,
  PRETEND_USER_ID_PREFIX,
  isPretendCohortEnabled,
} from "@/lib/pretendCohort";

// Looks up a pretend user by id, for the dev "sign in as…" switcher.
// Returns null (nobody) unless ALL of these are true:
// - the pretend cohort is switched on here (never on production),
// - the id is a pretend user's id,
// - that user exists.
//
// Why insist on the "pretend-user-" prefix: once slice 1 lands, real students
// may exist on the dev database. The switcher must never be a way to become a
// real person, even if someone edits their cookie by hand.
//
// It is separate from getCurrentUser() so the tests can check these rules
// directly, without needing a browser to send a cookie.
//
// Owner: foundation (#7). Removed at join-up (#17) with the switcher.
export async function findPretendUser(userId: string): Promise<User | null> {
  if (!isPretendCohortEnabled()) {
    return null;
  }
  if (!userId.startsWith(PRETEND_USER_ID_PREFIX)) {
    return null;
  }
  return prisma.user.findUnique({ where: { id: userId } });
}

// Returns the signed-in user, or null if nobody is signed in.
//
// NOW: "signed in" means "picked in the dev switcher". The switcher stores
// the chosen pretend user's id in a cookie, and this reads it back. Where the
// pretend cohort is off (including production) it always returns null, so
// until slice 1 lands nobody can be signed in on the live site.
//
// LATER: slice 1 (#8) replaces the inside with Auth.js's real session. The
// name, and what it returns, stay the same.
//
// It returns the whole User row and nothing more. If you need the person's
// profile, load it yourself with their id. (Slice 1 has to be able to swap
// the inside without knowing what each caller wanted on top.)
//
// It does NOT hide suspended users: "suspended users can't sign in" is
// slice 1's and slice 8's rule. Until then, being able to act as the
// suspended pretend user is how track 4 tests that they vanish from the graph.
//
// Can only be called while handling a request (in a page, a layout or an API
// route), because that is the only time there are cookies to read.
//
// Owner: foundation (#7) now, slice 1 (#8) afterwards.
export async function getCurrentUser(): Promise<User | null> {
  // Checked before touching the cookie, so that where the cohort is off we
  // don't even read it.
  if (!isPretendCohortEnabled()) {
    return null;
  }

  // In this version of Next.js, cookies() is async and must be awaited.
  const cookieStore = await cookies();
  const chosenUserId = cookieStore.get(DEV_USER_COOKIE)?.value;
  if (!chosenUserId) {
    return null;
  }

  return findPretendUser(chosenUserId);
}

// The shared check for admin-only pages. Call it at the top of the page:
//
//   const admin = await requireAdmin();
//
// - Nobody signed in  -> sent to the sign-in page.
// - Signed in, but not an admin -> shown the standard "page not found" page.
// - An admin -> the function returns that user and the page carries on.
//
// Both redirect() and notFound() work by throwing, so the page stops right
// there. Nothing after the call runs for someone who isn't an admin.
//
// Why "not found" for a member, and not a "forbidden" page: Next.js's
// forbidden() is still marked experimental and needs a config flag.
// notFound() is stable, and it doesn't confirm to a curious member that an
// admin area exists at all (foundation design decision 9).
//
// Why one shared function: tracks 2 and 3 both build pages under /admin, and
// two hand-written checks would be two chances to get it wrong.
//
// Owner: foundation (#7) now, slice 8 (#15) afterwards.
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }
  if (user.role !== "ADMIN") {
    notFound();
  }
  return user;
}
