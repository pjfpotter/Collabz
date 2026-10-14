// ONE CONVERSATION, FOR ITS PAGE (slice 6, #13, design decisions 2 and 6).
//
// getConversation(userId, conversationId) returns the other person and the
// messages, oldest first, or null.
//
// WHY null FOR "NOT YOURS" AND "NO SUCH ONE" ALIKE: the page shows the same
// "page not found" for both, so an id can't be probed to find out whether
// somebody else's conversation exists (the same reasoning as sendMessage).
//
// A CLOSED CONVERSATION IS STILL RETURNED, so what was said can be read.
//
// WHAT IS RETURNED: aliases, silhouette, the text and the time, and whether
// each message is the viewer's own. Never an email and never a user id.

import { aliasToAddress } from "@/lib/cohort/aliasAddress";
import { prisma } from "@/lib/db";

export type ConversationMessage = {
  id: string;
  body: string;
  createdAt: Date;
  // True when the viewer wrote it, so the page can say "You".
  mine: boolean;
  // The writer's alias.
  senderAlias: string;
};

export type ConversationView = {
  conversationId: string;
  closed: boolean;
  // The other person.
  alias: string;
  address: string;
  silhouette: string;
  // Oldest first, the way a conversation is read.
  messages: ConversationMessage[];
};

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationView | null> {
  const row = await prisma.conversation.findFirst({
    // "Yours" is part of the lookup itself, so a conversation that isn't the
    // viewer's never leaves the database.
    where: {
      id: conversationId,
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    select: {
      id: true,
      userAId: true,
      closedAt: true,
      userA: { select: { profile: { select: { alias: true, silhouette: true } } } },
      userB: { select: { profile: { select: { alias: true, silhouette: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true, senderId: true },
      },
    },
  });
  if (!row) {
    return null;
  }

  const viewerIsA = row.userAId === userId;
  const me = viewerIsA ? row.userA.profile : row.userB.profile;
  const other = viewerIsA ? row.userB.profile : row.userA.profile;
  // Both people went through onboarding, so this only guards the types.
  if (!me || !other) {
    return null;
  }

  return {
    conversationId: row.id,
    closed: row.closedAt !== null,
    alias: other.alias,
    address: aliasToAddress(other.alias),
    silhouette: other.silhouette,
    messages: row.messages.map((message) => {
      const mine = message.senderId === userId;
      return {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        mine,
        senderAlias: mine ? me.alias : other.alias,
      };
    }),
  };
}
