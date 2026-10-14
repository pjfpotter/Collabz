// Two rules Auth.js runs for us during sign-in (slice 1, #8).
//
// They're wired up in src/auth.ts (`callbacks.signIn` and
// `events.createUser`), but live here as plain named functions so the
// integration tests can call them directly, without a browser or a real
// magic link.
//
// Owner: slice 1 (#8).

import { prisma } from "@/lib/db";

import { isAdminEmail } from "./adminEmails";

// May this email finish signing in? False only for a suspended account.
// (user-auth spec: "Suspended users can't sign in", design decision 6.)
//
// We look the person up by email, fresh from the database, rather than
// trusting the copy Auth.js hands us. Someone signing in for the very first
// time has no row yet, so they're allowed in (there's nothing to suspend).
export async function mayFinishSignIn(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { suspendedAt: true },
  });

  const isSuspended = user !== null && user.suspendedAt !== null;
  return !isSuspended;
}

// Make a brand-new account an admin if its email is on ADMIN_EMAILS.
// (user-auth spec: "First admins come from the deployment's settings",
// design decision 5.)
//
// Auth.js calls this ONCE, right after it creates the User row. Why only
// then, not at every sign-in: otherwise someone an admin deliberately demoted
// (slice 8) would be promoted again the next time they signed in.
//
// `adminList` is the raw ADMIN_EMAILS value, passed in so tests can choose it.
export async function applyAdminList(
  user: { id: string; email: string },
  adminList: string | undefined,
): Promise<void> {
  if (!isAdminEmail(user.email, adminList)) {
    // Everyone else stays a member, which is the table's default.
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });
}
