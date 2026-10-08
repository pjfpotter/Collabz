// Conversations - the shared entry points.
//
// SHARED HELPERS. Connection requests (slice 5) opens a conversation when a
// request is approved, and safety (slice 9) closes one when someone blocks.
// Both call these and never touch the Conversation table themselves.
//
// These are minimal versions: just enough for other tracks to build on.
// Slice 6 (#13) owns them and may grow them, keeping the names.

import type { Conversation } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { orderUserPair } from "@/lib/userPair";

// Returns the conversation between two users, creating it if they don't have
// one yet. The order of the two ids doesn't matter.
//
// It is safe to call twice: the second call finds the first call's
// conversation rather than making another.
//
// If the pair's conversation has been CLOSED (for example by a block), it is
// returned as it is, still closed. Whether a closed conversation can ever be
// reopened is slice 6's decision, so this version doesn't make it.
//
// It does not check that the two people are allowed to talk. The caller
// (slice 5, on approving a request) is responsible for that.
//
// Owner: foundation (#7) now, slice 6 (#13) afterwards.
export async function openConversation(
  firstUserId: string,
  secondUserId: string,
): Promise<Conversation> {
  // A pair is stored once, lower id first (see src/lib/userPair.ts).
  const { userAId, userBId } = orderUserPair(firstUserId, secondUserId);

  // upsert = "update it if it exists, otherwise create it", done by the
  // database as ONE step. We use it instead of "look, then create if missing"
  // because two requests arriving at the same moment could both look, both
  // find nothing, and both try to create. `update: {}` means "if it exists,
  // change nothing and just give it to me".
  return prisma.conversation.upsert({
    // userAId_userBId is the name Prisma gives the "one conversation per
    // pair" rule from schema.prisma.
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId },
  });
}

// Closes a conversation, so no more messages can be sent in it.
//
// Safe to call twice: a conversation that is already closed keeps its
// original closing time.
//
// NOW: it only records the time in `closedAt`. Refusing new messages in a
// closed conversation is slice 6's job when it builds sending.
//
// Owner: foundation (#7) now, slice 6 (#13) afterwards.
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
