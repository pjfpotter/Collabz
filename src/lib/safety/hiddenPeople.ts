// WHO IS HIDDEN FROM A VIEWER BECAUSE OF A BLOCK (slice 9, #16, design 3).
//
// A block hides the two people from each other everywhere: graph, people
// list, profile page, matches and requests. Every one of those pages asks
// THIS function for the list, so the rule is written once and a page can't
// forget half of it.
//
// WHY A FILTER AT READ TIME AND NOT DELETING SCORES: scores are stored per
// pair and shared, so removing them would also need a full rescore to undo
// and would be easy to get wrong. Filtering the viewer's own view is cheap at
// 30 to 100 people and reversible.
//
// BOTH DIRECTIONS: it doesn't matter who pressed Block. If A blocked B, B is
// hidden from A and A is hidden from B. The caller never learns which of the
// two it was (a blocked person must not be able to tell they were blocked).

// Relative path, not "@/lib/db", because slice 3's matching files import this
// and the seed script that runs them doesn't understand the "@/" shortcut.
import { prisma } from "../db";

// The user ids of everyone who has blocked `viewerId`, or been blocked by
// them. One query, and callers then filter their own lists against the set.
export async function getHiddenUserIds(viewerId: string): Promise<Set<string>> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });

  const hiddenIds = new Set<string>();
  for (const block of blocks) {
    // Whichever side of the block ISN'T the viewer is the hidden person.
    hiddenIds.add(block.blockerId === viewerId ? block.blockedId : block.blockerId);
  }
  return hiddenIds;
}
