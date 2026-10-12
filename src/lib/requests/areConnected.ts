// "HAVE THESE TWO AGREED TO CONNECT?" (slice 5, #12, design decision 6).
//
// This is the rule for who may see someone's PHOTO. Slice 7 (#14) owns photo
// upload and serving, and calls this before it serves one. Nothing in slice 5
// touches a photo: only the rule lives here.
//
// Two people are connected when:
//   1. a request between them has been APPROVED (either person may have sent
//      it), and
//   2. neither has blocked the other.
//
// WHY THE BLOCK IS PART OF IT: the safety spec says a block hides any revealed
// photo again. Because this function looks at blocks every time, slice 9 needs
// no extra code here: blocking makes this false by itself.
//
// WHY NOT LOOK AT THE CONVERSATION: a conversation can be closed for reasons
// other than a block, and slice 6 owns what that means. The approved request
// plus the block table is the whole rule in the spec.

import { prisma } from "@/lib/db";

import { hasBlockBetween } from "./pairRules";

export async function areConnected(userIdA: string, userIdB: string): Promise<boolean> {
  // Nobody is "connected" to themselves, and this also stops a caller
  // passing the same id twice by mistake and getting `true` from a request
  // that can't exist.
  if (userIdA === userIdB) {
    return false;
  }

  const approved = await prisma.connectionRequest.findFirst({
    where: {
      status: "APPROVED",
      OR: [
        { fromUserId: userIdA, toUserId: userIdB },
        { fromUserId: userIdB, toUserId: userIdA },
      ],
    },
    select: { id: true },
  });
  if (!approved) {
    return false;
  }

  return !(await hasBlockBetween(userIdA, userIdB));
}
