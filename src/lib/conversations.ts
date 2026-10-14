// Conversations - the shared entry points.
//
// SHARED HELPERS. Connection requests (slice 5) opens a conversation when a
// request is approved, and safety (slice 9) closes one when someone blocks.
// Both call these and never touch the Conversation table themselves.
//
// Slice 6 (#13) owns these two. The names and what they take and return are
// the contract other tracks rely on, so they must not change. The rules for
// SENDING and READING messages live in src/lib/messages/, not here.

import { Prisma } from "@/generated/prisma/client";
import type { Conversation } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { orderUserPair } from "@/lib/userPair";

// Returns the conversation between two users, creating it if they don't have
// one yet. The order of the two ids doesn't matter.
//
// It is safe to call twice, even at the same moment: the second call finds
// the first call's conversation rather than making another.
//
// If the pair's conversation has been CLOSED (for example by a block), it is
// returned as it is, still closed. This is a decided rule (slice 6, design
// decision 4): a closed conversation NEVER reopens, so a block is final and
// slice 9 can rely on it. Do not "fix" this by clearing closedAt here.
//
// It does not check that the two people are allowed to talk. The caller
// (slice 5, on approving a request) is responsible for that.
//
// Owner: slice 6 (#13). Built by the foundation (#7).
export async function openConversation(
  firstUserId: string,
  secondUserId: string,
): Promise<Conversation> {
  // A pair is stored once, lower id first (see src/lib/userPair.ts).
  const { userAId, userBId } = orderUserPair(firstUserId, secondUserId);

  // upsert = "update it if it exists, otherwise create it". `update: {}`
  // means "if it exists, change nothing and just give it to me".
  //
  // upsert is NOT a single atomic step with our database adapter: it can look,
  // find nothing, and then insert. So two calls at the same moment can both
  // look, both find nothing, and both try to insert. The database's "one
  // conversation per pair" rule lets only one insert win and refuses the
  // other with error P2002 (unique constraint failed).
  try {
    return await prisma.conversation.upsert({
      // userAId_userBId is the name Prisma gives the "one conversation per
      // pair" rule from schema.prisma.
      where: { userAId_userBId: { userAId, userBId } },
      update: {},
      create: { userAId, userBId },
    });
  } catch (error) {
    // Only this one error is expected. Anything else (a lost connection, say)
    // is a real problem and must still reach the caller.
    const lostTheRace =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002";
    if (!lostTheRace) {
      throw error;
    }

    // Losing the race means the other call has just created the pair's
    // conversation, so reading it back is safe and gives both callers the
    // same row.
    return prisma.conversation.findUniqueOrThrow({
      where: { userAId_userBId: { userAId, userBId } },
    });
  }
}

// Closes a conversation, so no more messages can be sent in it.
//
// Safe to call twice: a conversation that is already closed keeps its
// original closing time.
//
// This only records the time in `closedAt`. The refusal of new messages lives
// in sendMessage (src/lib/messages/), which checks `closedAt` every time, so
// closing here is enough. A closed conversation can still be READ.
//
// Owner: slice 6 (#13). Built by the foundation (#7).
export async function closeConversation(conversationId: string): Promise<void> {
  // updateMany with a filter, rather than update: the `closedAt: null` part
  // means "only if it is still open". An already-closed conversation simply
  // matches nothing, so its first closing time is never overwritten, and
  // asking to close one that doesn't exist is not an error either.
  await prisma.conversation.updateMany({
    where: { id: conversationId, closedAt: null },
    data: { closedAt: new Date() },
  });
}
