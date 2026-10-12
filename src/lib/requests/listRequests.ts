// WHAT THE /requests PAGE AND THE NAV COUNT SHOW (slice 5, #12, design
// decision 5).
//
// getRequestsPage() returns the two lists the page draws, and
// countWaitingRequests() returns how many are waiting. They are built from
// ONE filter (waitingWhere below) so the count in the nav bar can never be
// bigger than the list, which would mean an Approve button that can't work.
//
// WHAT IS LEFT OUT, quietly:
//   - a request whose other person has been suspended or hasn't a finished
//     profile (they have vanished from the app everywhere else), and
//   - a request between two people where either has blocked the other.
// Leaving the second out also means a block can't be detected from here:
// the person who was blocked just sees the request disappear from the lists.
//
// WHAT IS RETURNED: only what the page may show. An alias, its page address,
// the silhouette's id, a date, and the request's own id (which the Approve
// and Decline buttons post to). Never an email and never a user id.

import { aliasToAddress } from "@/lib/cohort/aliasAddress";
import { prisma } from "@/lib/db";

import { visibleUserFilter } from "./pairRules";

// A request waiting for the viewer's answer.
export type WaitingRequest = {
  requestId: string;
  // The sender's alias, and the last part of their profile address.
  alias: string;
  address: string;
  silhouette: string;
  createdAt: Date;
};

// What a request the viewer sent has come to, in the words the page uses.
export type SentRequestStatus = "waiting" | "connected" | "declined";

export type SentRequest = {
  requestId: string;
  // The person who was asked.
  alias: string;
  address: string;
  silhouette: string;
  status: SentRequestStatus;
  createdAt: Date;
};

export type RequestsPage = {
  waiting: WaitingRequest[];
  sent: SentRequest[];
};

// Everyone who has blocked `userId`, or been blocked by them. One query, and
// then each list is filtered against the answer.
async function findBlockedCounterpartIds(userId: string): Promise<Set<string>> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const block of blocks) {
    // Whichever side of the block ISN'T this user is the other person.
    ids.add(block.blockerId === userId ? block.blockedId : block.blockerId);
  }
  return ids;
}

// The one filter behind "waiting for your answer": pending, sent to this
// user, and the sender is visible.
//
// (The block rule is applied after the query, in findWaiting, because a block
// is a row about a PAIR and is easier to read as a set of ids.)
function waitingWhere(userId: string) {
  return {
    toUserId: userId,
    status: "PENDING" as const,
    fromUser: visibleUserFilter,
  };
}

// The waiting requests, newest first, with the blocked ones already removed.
async function findWaiting(userId: string) {
  const [requests, blockedIds] = await Promise.all([
    prisma.connectionRequest.findMany({
      where: waitingWhere(userId),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fromUserId: true,
        createdAt: true,
        fromUser: { select: { profile: { select: { alias: true, silhouette: true } } } },
      },
    }),
    findBlockedCounterpartIds(userId),
  ]);
  return requests.filter((request) => !blockedIds.has(request.fromUserId));
}

// How many requests are waiting for this user's answer: the number in the nav
// bar. Exactly the length of getRequestsPage(userId).waiting.
export async function countWaitingRequests(userId: string): Promise<number> {
  const waiting = await findWaiting(userId);
  return waiting.length;
}

// Turns the database's status into the page's word for it.
function toSentStatus(status: "PENDING" | "APPROVED" | "DECLINED"): SentRequestStatus {
  if (status === "APPROVED") return "connected";
  if (status === "DECLINED") return "declined";
  return "waiting";
}

// Both lists for the /requests page.
export async function getRequestsPage(userId: string): Promise<RequestsPage> {
  const waitingRows = await findWaiting(userId);

  const waiting: WaitingRequest[] = [];
  for (const row of waitingRows) {
    const profile = row.fromUser.profile;
    // A visible user always has a profile (that is part of "visible"), so
    // this only guards the types.
    if (!profile) continue;
    waiting.push({
      requestId: row.id,
      alias: profile.alias,
      address: aliasToAddress(profile.alias),
      silhouette: profile.silhouette,
      createdAt: row.createdAt,
    });
  }

  const [sentRows, blockedIds] = await Promise.all([
    prisma.connectionRequest.findMany({
      where: { fromUserId: userId, toUser: visibleUserFilter },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        toUserId: true,
        status: true,
        createdAt: true,
        toUser: { select: { profile: { select: { alias: true, silhouette: true } } } },
      },
    }),
    findBlockedCounterpartIds(userId),
  ]);

  const sent: SentRequest[] = [];
  for (const row of sentRows) {
    if (blockedIds.has(row.toUserId)) continue;
    const profile = row.toUser.profile;
    if (!profile) continue;
    sent.push({
      requestId: row.id,
      alias: profile.alias,
      address: aliasToAddress(profile.alias),
      silhouette: profile.silhouette,
      status: toSentStatus(row.status),
      createdAt: row.createdAt,
    });
  }

  return { waiting, sent };
}
