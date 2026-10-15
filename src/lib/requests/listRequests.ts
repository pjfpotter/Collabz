// WHAT THE /requests PAGE AND THE NAV COUNT SHOW (slice 5, #12, design
// decision 5).
//
// getRequestsPage() returns pending, sent and accepted-connection lists, and
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
import { getHiddenUserIds } from "@/lib/safety/hiddenPeople";

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

// Accepted requests are a connection for BOTH people, regardless of sender.
export type ConnectedPerson = {
  requestId: string;
  alias: string;
  address: string;
  silhouette: string;
};

export type RequestsPage = {
  waiting: WaitingRequest[];
  sent: SentRequest[];
  connected: ConnectedPerson[];
};

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
    getHiddenUserIds(userId),
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

// Read approved pairs in either direction. An incoming approval must not
// disappear just because it is neither pending nor "sent by you".
async function findConnected(userId: string): Promise<ConnectedPerson[]> {
  const [rows, blockedIds] = await Promise.all([
    prisma.connectionRequest.findMany({
      where: {
        status: "APPROVED",
        OR: [
          { fromUserId: userId, toUser: visibleUserFilter },
          { toUserId: userId, fromUser: visibleUserFilter },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fromUserId: true,
        toUserId: true,
        fromUser: { select: { profile: { select: { alias: true, silhouette: true } } } },
        toUser: { select: { profile: { select: { alias: true, silhouette: true } } } },
      },
    }),
    getHiddenUserIds(userId),
  ]);
  const connected: ConnectedPerson[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const viewerSent = row.fromUserId === userId;
    const otherId = viewerSent ? row.toUserId : row.fromUserId;
    const profile = (viewerSent ? row.toUser : row.fromUser).profile;
    // Legacy/demo data may contain multiple rows for a pair: show one person.
    if (!profile || blockedIds.has(otherId) || seen.has(otherId)) continue;
    seen.add(otherId);
    connected.push({
      requestId: row.id,
      alias: profile.alias,
      address: aliasToAddress(profile.alias),
      silhouette: profile.silhouette,
    });
  }
  return connected;
}

// Pending incoming requests, sent requests and accepted connections.
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
    getHiddenUserIds(userId),
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

  const connected = await findConnected(userId);
  return { waiting, sent, connected };
}
