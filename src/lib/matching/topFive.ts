// THE TOP 5 RANKING (slice 3, #10, design decision 7).
//
// This file holds the RANKING RULE as a plain function. Choosing a glitch
// match needs it (a glitch match is never someone in your top 5), and so will
// getTopFive() for pages (task 5.1), which reads the Edge table and then
// calls this.
//
// THE RULE (spec: "Top 5 is the same on every page load"):
//   1. highest score first,
//   2. equal scores: whoever finished their profile first,
//   3. still equal: the lower user id,
// and at most five. Rule 3 means the order never depends on the order the
// database happened to return rows in.

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
