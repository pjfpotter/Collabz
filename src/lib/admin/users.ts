// Admin actions on users (slice 8, #15, design 2 and 8).
//
// Same shape as courses.ts: functions that change something return a list of
// plain-English problems, and an empty list means it worked.
//
// Suspending is reversible and deletes nothing. A suspended user:
//   - can't sign in (getCurrentUser() returns nobody for them),
//   - is hidden from the graph, the list and search (visiblePeople),
//   - has no chemistry scores and is nobody's top 5 or glitch match
//     (eligiblePeople).
// The last two come from rescoring them, which we do right after saving.
//
// Callers (the Server Actions) check the person is an admin first.
//
// Owner: slice 8 (#15).

import { prisma } from "@/lib/db";
import { scoreUser } from "@/lib/matching";

// One row of the admin's users list. Only what the screen shows.
export type AdminUserRow = {
  id: string;
  email: string;
  role: "MEMBER" | "ADMIN";
  courseName: string | null;
  // The public alias, or null if they haven't built a profile yet.
  alias: string | null;
  suspendedAt: Date | null;
  hasPhoto: boolean;
};

// Every user, oldest account first. Admins are allowed to see emails (the
// "never shown to other users" rule is about members).
export async function listUsers(): Promise<AdminUserRow[]> {
  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      role: true,
      suspendedAt: true,
      course: { select: { name: true } },
      profile: { select: { alias: true, photoKey: true } },
    },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    courseName: user.course?.name ?? null,
    alias: user.profile?.alias ?? null,
    suspendedAt: user.suspendedAt,
    hasPhoto: user.profile?.photoKey != null,
  }));
}

// Suspends a user. `adminId` is the admin doing it, so we can refuse the one
// case that would lock people out: suspending yourself.
export async function suspendUser(adminId: string, userId: string): Promise<string[]> {
  // Checked here, not just by hiding the button, because a Server Action can
  // be called directly (design 8).
  if (adminId === userId) {
    return ["You can't suspend your own account."];
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return ["That user doesn't exist."];
  }

  // Already suspended: nothing to do, and keep the original date.
  if (user.suspendedAt === null) {
    await prisma.user.update({ where: { id: userId }, data: { suspendedAt: new Date() } });
  }

  // Rescore AFTER saving, so a scoring problem can never undo the
  // suspension (the same rule scoreUser's header gives).
  await scoreUser(userId);
  return [];
}

export async function unsuspendUser(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return ["That user doesn't exist."];
  }

  if (user.suspendedAt !== null) {
    await prisma.user.update({ where: { id: userId }, data: { suspendedAt: null } });
  }

  // They come back into everyone's scores.
  await scoreUser(userId);
  return [];
}
