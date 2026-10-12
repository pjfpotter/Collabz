// THE TOP 5 (slice 3, #10, design decision 7).
//
// Two parts. findTopFiveIds() is the RANKING RULE as a plain function with no
// database: choosing a glitch match needs it (a glitch match is never someone
// in your top 5). getTopFive() is what pages and other tracks call: it reads
// the Edge table and the eligible people, then uses the rule.
//
// THE RULE (spec: "Top 5 is the same on every page load"):
//   1. highest score first,
//   2. equal scores: whoever finished their profile first,
//   3. still equal: the lower user id,
// and at most five. Rule 3 means the order never depends on the order the
// database happened to return rows in.

import { prisma } from "@/lib/db";

import { getEligiblePeople } from "./eligiblePeople";

// How many matches "top 5" means. A named constant so the number appears once.
export const TOP_MATCH_COUNT = 5;

// One stored score, with just what ranking needs.
export type ScoredEdge = {
  userAId: string;
  userBId: string;
  score: number;
};

// Ranks `ownerId`'s matches and returns the user ids of the best five.
//
// - `edges` may hold any number of rows, including other people's pairs;
//   only rows that involve `ownerId` are looked at.
// - `finishedAtByUserId` is the list of ELIGIBLE people and when they
//   finished. Anyone not in it (unfinished, suspended) is left out, so they
//   can never be in a top 5.
export function findTopFiveIds(
  ownerId: string,
  edges: ScoredEdge[],
  finishedAtByUserId: Map<string, Date>,
): string[] {
  const candidates: { userId: string; score: number; finishedAt: Date }[] = [];

  for (const edge of edges) {
    if (edge.userAId !== ownerId && edge.userBId !== ownerId) {
      continue; // somebody else's pair
    }
    // Whichever side of the row isn't the owner is the other person.
    const otherUserId = edge.userAId === ownerId ? edge.userBId : edge.userAId;

    const finishedAt = finishedAtByUserId.get(otherUserId);
    if (!finishedAt) {
      continue; // not eligible
    }
    candidates.push({ userId: otherUserId, score: edge.score, finishedAt });
  }

  candidates.sort((first, second) => {
    if (first.score !== second.score) {
      return second.score - first.score; // highest first
    }
    if (first.finishedAt.getTime() !== second.finishedAt.getTime()) {
      return first.finishedAt.getTime() - second.finishedAt.getTime(); // earliest first
    }
    // Plain < on strings, the same comparison as orderUserPair, so every
    // machine agrees.
    return first.userId < second.userId ? -1 : 1;
  });

  return candidates.slice(0, TOP_MATCH_COUNT).map((candidate) => candidate.userId);
}

// ---------------------------------------------------------------------------
// What pages and other tracks call
// ---------------------------------------------------------------------------

// One of a user's best matches. The same shape as the stand-in in
// src/lib/cohort/standIns.ts (TopMatch), so join-up is a swap, not a rewrite.
export type TopMatch = {
  userId: string;
  score: number;
};

// Returns the user's (up to) five best matches, best first, from the scores
// already stored in the Edge table. It never recalculates anything.
//
// - Suspended and unfinished people are left out (they are not "eligible"),
//   so a highlighted match is always someone who can be seen and contacted.
// - The same people in the same order on every call, until a score changes
//   (see the ranking rule above).
// - Someone who is not eligible themselves gets an empty list.
// - Fewer than five available people gives fewer than five.
//
// Owner: slice 3 (#10).
export async function getTopFive(userId: string): Promise<TopMatch[]> {
  const people = await getEligiblePeople();
  const finishedAtByUserId = new Map(people.map((person) => [person.userId, person.completedAt]));

  if (!finishedAtByUserId.has(userId)) {
    return [];
  }

  // A pair's score is stored ONCE, with the lower user id in userAId, so this
  // user can be on either side of the row: ask for both.
  const edges = await prisma.edge.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true, score: true },
  });

  const topIds = findTopFiveIds(userId, edges, finishedAtByUserId);

  // findTopFiveIds gives the ids in rank order. Look the scores up so the
  // result keeps that order.
  const scoreByOtherId = new Map(
    edges.map((edge) => [edge.userAId === userId ? edge.userBId : edge.userAId, edge.score]),
  );
  return topIds.map((otherId) => ({
    userId: otherId,
    score: scoreByOtherId.get(otherId) ?? 0,
  }));
}
