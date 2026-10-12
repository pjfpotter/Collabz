// SMALL RULES ABOUT A PAIR OF PEOPLE (slice 5, #12).
//
// Sending a request, answering one, and listing the ones waiting all ask the
// same two questions: "is this person visible?" and "has either blocked the
// other?". They are written ONCE here so the three can never disagree (a
// request you couldn't send must not be one you can answer, and the count in
// the nav bar must not include one you can't answer).

import { getVisiblePeople } from "@/lib/cohort/visiblePeople";
import { prisma } from "@/lib/db";

// Is this person visible: a finished profile and not suspended? This is the
// same rule the graph and the people list use (getVisiblePeople), so a
// suspended person is "unavailable" here exactly as they vanish from the
// graph.
export async function isUserVisible(userId: string): Promise<boolean> {
  const visiblePeople = await getVisiblePeople();
  return visiblePeople.some((person) => person.userId === userId);
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
