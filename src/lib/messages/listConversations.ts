// THE LIST ON /messages (slice 6, #13, design decisions 5 and 6).
//
// listConversations(userId) returns the conversations this person is in,
// newest activity first, with just enough to draw one row each.
//
// WHAT IS RETURNED: only what the page may show. The other person's alias,
// its page address and silhouette id, the start of the latest message and its
// time, and whether the conversation is closed. Plus the conversation's own
// id, which the row links to. Never an email and never the other person's
// user id.
//
// WHAT IS NOT LEFT OUT: closed conversations stay in the list (marked), so
// people can still read what was said. A suspended person's conversation
// also stays: it is only sending that is refused (sendMessage).

import { aliasToAddress } from "@/lib/cohort/aliasAddress";
import { prisma } from "@/lib/db";

// How many characters of the latest message the list shows before "...".
const PREVIEW_LENGTH = 80;

export type ConversationSummary = {
  conversationId: string;
  // The other person's alias, and the last part of their profile address.
  alias: string;
  address: string;
  silhouette: string;
  closed: boolean;
  // The start of the latest message, or null if nothing was said yet.
  latestPreview: string | null;
  // When the latest message was sent, or null if nothing was said yet.
  latestAt: Date | null;
  // When the conversation was opened, used for ordering when there are no
  // messages.
  startedAt: Date;
};

// Shortens a message for the list, adding "..." only if something was cut.
export function makePreview(body: string): string {
  if (body.length <= PREVIEW_LENGTH) {
    return body;
  }
  return `${body.slice(0, PREVIEW_LENGTH).trimEnd()}...`;
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const rows = await prisma.conversation.findMany({
    // A conversation is the viewer's if they are either of its two people.
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: {
      id: true,
      userAId: true,
      createdAt: true,
      closedAt: true,
      userA: { select: { profile: { select: { alias: true, silhouette: true } } } },
      userB: { select: { profile: { select: { alias: true, silhouette: true } } } },
      // Only the newest message is needed for the row.
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true },
      },
    },
  });

  const summaries: ConversationSummary[] = [];
  for (const row of rows) {
    // The "other person" is whichever side isn't the viewer.
    const other = row.userAId === userId ? row.userB : row.userA;
    const profile = other.profile;
    // Everyone who has a conversation went through onboarding, so this only
    // guards the types. Without a profile there is no alias to show.
    if (!profile) continue;

    const latest = row.messages[0] ?? null;
    summaries.push({
      conversationId: row.id,
      alias: profile.alias,
      address: aliasToAddress(profile.alias),
      silhouette: profile.silhouette,
      closed: row.closedAt !== null,
      latestPreview: latest ? makePreview(latest.body) : null,
      latestAt: latest ? latest.createdAt : null,
      startedAt: row.createdAt,
    });
  }

  // Newest activity first. Done here, not in the query, because "latest
  // message, or else when it was opened" is not a column the database has.
  summaries.sort((first, second) => {
    const firstTime = (first.latestAt ?? first.startedAt).getTime();
    const secondTime = (second.latestAt ?? second.startedAt).getTime();
    return secondTime - firstTime;
  });
  return summaries;
}
