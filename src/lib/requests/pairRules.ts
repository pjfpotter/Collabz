// SMALL RULES ABOUT A PAIR OF PEOPLE (slice 5, #12).
//
// Sending a request, answering one, and listing the ones waiting all ask the
// same two questions: "is this person visible?" and "has either blocked the
// other?". They are written ONCE here so the three can never disagree (a
// request you couldn't send must not be one you can answer, and the count in
// the nav bar must not include one you can't answer).

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

// "Visible" as a database filter: a finished profile, and not suspended.
//
// This is the SAME rule as getVisiblePeople() in src/lib/cohort/visiblePeople.ts
// (the graph and the people list), written as a filter so the database can
// apply it inside a query. The nav bar's count runs on every page, and
// loading the whole cohort each time just to count would be wasteful.
//
// WHY THIS IS NOT A SECOND COPY OF THE RULE THAT CAN DRIFT: the test in
// tests/integration/listRequests.test.ts checks that isUserVisible() and
// getVisiblePeople() agree for finished, unfinished and suspended people.
// If someone changes one, that test fails.
export const visibleUserFilter: Prisma.UserWhereInput = {
  suspendedAt: null,
  profile: { is: { completedAt: { not: null } } },
};

// Is this person visible: a finished profile and not suspended? So a
// suspended person is "unavailable" here exactly as they vanish from the
// graph.
export async function isUserVisible(userId: string): Promise<boolean> {
  const matching = await prisma.user.count({
    where: { id: userId, ...visibleUserFilter },
  });
  return matching > 0;
}

// Has either of the two blocked the other? (The Block table is slice 9's.
// This only reads it.)
export async function hasBlockBetween(userId: string, otherUserId: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: userId },
      ],
    },
    select: { blockerId: true },
  });
  return block !== null;
}
