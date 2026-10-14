// Who gets sent where, depending on their profile (slice 2, #9, design
// decision 6).
//
// SHARED HELPER for every page that needs a finished profile. Call it at the
// top of the page:
//
//   const user = await redirectIfOnboardingIncomplete();
//
// - Nobody signed in             -> sent to /signin.
// - Signed in, profile not done  -> sent to /onboarding.
// - Otherwise                    -> returns the signed-in user.
//
// redirect() works by throwing, so the page stops right there and nothing
// after the call runs.
//
// WHY A HELPER AND NOT NEXT.JS MIDDLEWARE: middleware runs before the page in
// a cut-down environment where our database client doesn't run. A helper is
// also something you can see at the top of each page.
//
// Other tracks' pages use a stand-in with the same behaviour
// (requireFinishedProfile in src/lib/cohort/standIns.ts). Join-up (#17)
// swaps them over; slice 2 only edits its own routes.
//
// Owner: slice 2 (#9).

import { redirect } from "next/navigation";

import type { User } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/currentUser";
import { prisma } from "@/lib/db";

export async function redirectIfOnboardingIncomplete(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  if (!(await hasFinishedOnboarding(user.id))) {
    redirect("/onboarding");
  }
  return user;
}

// True when the person has a profile AND it's marked complete. A profile row
// without completedAt (after an admin's reset) counts as not finished.
export async function hasFinishedOnboarding(userId: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { completedAt: true },
  });
  return Boolean(profile?.completedAt);
}
