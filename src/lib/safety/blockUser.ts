// BLOCKING SOMEONE (slice 9, #16, design 2).
//
// After a block:
//   - neither person can send the other a request or a message (the request
//     and message rules in slice 5 and 6 already read the Block table),
//   - their conversation, if they had one, is closed for good,
//   - their photos are hidden from each other (canSeePhoto goes through
//     areConnected, which says "not connected" when a block exists),
//   - they vanish from each other's lists (getHiddenUserIds).
//
// This function only has to STORE the block and CLOSE the conversation; the
// rest follows from the Block row.
//
// Same shape as slice 8's admin functions: it returns a list of plain-English
// problems, and an empty list means it worked.

import { closeConversation } from "@/lib/conversations";
import { prisma } from "@/lib/db";
import { orderUserPair } from "@/lib/userPair";

export async function blockUser(blockerId: string, blockedId: string): Promise<string[]> {
  // Nobody can block themselves. Checked here, and not just by hiding the
  // button, because a Server Action is a public address.
  if (blockerId === blockedId) {
    return ["You can't block yourself."];
  }

  const blocked = await prisma.user.findUnique({
    where: { id: blockedId },
    select: { id: true },
  });
  if (!blocked) {
    return ["That person could not be found."];
  }

  // STEP 1: store the block. createMany with skipDuplicates means blocking
  // someone you already blocked quietly does nothing, instead of failing on
  // the "one row per pair and direction" rule.
  await prisma.block.createMany({
    data: [{ blockerId, blockedId }],
    skipDuplicates: true,
  });

  // STEP 2: close their conversation, if they have one. Saved in this order
  // so that a failure can never leave an open conversation with no block
  // recorded; sendMessage refuses blocked pairs anyway.
  //
  // We LOOK UP the conversation rather than calling openConversation(),
  // because that one creates a conversation when there isn't one, and we
  // would be making a conversation just to close it.
  const { userAId, userBId } = orderUserPair(blockerId, blockedId);
  const conversation = await prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true },
  });
  if (conversation) {
    // closeConversation is slice 6's shared helper, safe to call twice.
    await closeConversation(conversation.id);
  }

  return [];
}
