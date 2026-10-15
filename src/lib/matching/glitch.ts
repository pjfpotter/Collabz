// GLITCH MATCHES (slice 3, #10, design decision 5).
//
// A glitch match is one random person, outside your top 5, that you are shown
// as a surprise. The rules (spec: "Every finished user has one stable glitch
// match"):
//
//   - never yourself,
//   - never someone in your top 5,
//   - never someone suspended or without a finished profile,
//   - chosen at random, then STORED, so reloading a page or being rescored
//     doesn't change it. A stored one is kept for as long as it is still valid
//     under the rules above, and is replaced when it stops being valid.
//
// THE FILE HAS TWO PARTS. The first is plain functions with no database, so
// the rules can be tested exactly. The second reads and writes the
// GlitchMatch table and calls the first.
//
// WHY THE RANDOM SOURCE IS A PARAMETER: tests need the same "random" pick
// every time, so every function that chooses takes `random` (a function that
// returns a number from 0 up to, but not including, 1, like Math.random).
// Production passes Math.random.

// Relative path, not "@/lib/db", on purpose: prisma/seed-fake.ts scores the
// pretend cohort through this file, and a seed script and Playwright's test
// runner don't understand the "@/" shortcut the Next.js app uses.
import { prisma } from "../db";
import { getHiddenUserIds } from "../safety/hiddenPeople";

import { getEligiblePeople, type DbClient } from "./eligiblePeople";
import { findTopFiveIds } from "./topFive";

// A function that gives a number from 0 up to (not including) 1.
export type RandomSource = () => number;

// ---------------------------------------------------------------------------
// Part 1: the rules, with no database
// ---------------------------------------------------------------------------

// Picks a NEW glitch match for `userId`, or returns null if nobody qualifies.
//
// `candidateIds` should be every eligible person; this removes the user
// themselves and anyone in `topFiveIds`.
export function pickGlitchMatch(
  userId: string,
  candidateIds: string[],
  topFiveIds: string[],
  random: RandomSource,
): string | null {
  const excluded = new Set([userId, ...topFiveIds]);

  // Sorted, so that the same "random" number always lands on the same person
  // whatever order the caller happened to list them in.
  const options = [...new Set(candidateIds)].filter((id) => !excluded.has(id)).sort();
  if (options.length === 0) {
    return null; // a cohort that is too small has no glitch match yet
  }

  // random() is below 1, so this is a valid position. Math.min is only a
  // guard in case a random source ever returns exactly 1.
  const position = Math.min(Math.floor(random() * options.length), options.length - 1);
  return options[position];
}

// Is a stored glitch match still allowed?
export function isGlitchMatchValid(
  ownerId: string,
  matchedUserId: string,
  eligibleIds: string[],
  topFiveIds: string[],
): boolean {
  return (
    matchedUserId !== ownerId &&
    eligibleIds.includes(matchedUserId) &&
    !topFiveIds.includes(matchedUserId)
  );
}

// What a user's glitch match should be right now: the stored one if it is
// still valid, otherwise a new pick, otherwise null (nobody qualifies).
export function chooseGlitchMatch(
  ownerId: string,
  storedMatchedUserId: string | null,
  eligibleIds: string[],
  topFiveIds: string[],
  random: RandomSource,
): string | null {
  if (
    storedMatchedUserId !== null &&
    isGlitchMatchValid(ownerId, storedMatchedUserId, eligibleIds, topFiveIds)
  ) {
    return storedMatchedUserId; // kept: this is what makes it "stable"
  }
  return pickGlitchMatch(ownerId, eligibleIds, topFiveIds, random);
}

// ---------------------------------------------------------------------------
// Part 2: the GlitchMatch table
// ---------------------------------------------------------------------------

// Writes what `chooseGlitchMatch` decided, and only if it changed anything.
//
// `upsert` ("update it if it exists, otherwise create it") rather than "look,
// then create": GlitchMatch's id is the owner's user id, so there can only
// ever be one row each, and upsert can't trip over a second request that
// arrives at the same moment.
export async function saveGlitchMatch(
  db: DbClient,
  ownerId: string,
  storedMatchedUserId: string | null,
  chosenMatchedUserId: string | null,
): Promise<void> {
  if (chosenMatchedUserId === storedMatchedUserId) {
    return; // nothing to do, which is the usual case on a reload
  }

  if (chosenMatchedUserId === null) {
    // The old one is no longer valid and nobody qualifies as a replacement.
    // deleteMany (not delete) so "already gone" is not an error.
    await db.glitchMatch.deleteMany({ where: { userId: ownerId } });
    return;
  }

  await db.glitchMatch.upsert({
    where: { userId: ownerId },
    update: { matchedUserId: chosenMatchedUserId },
    create: { userId: ownerId, matchedUserId: chosenMatchedUserId },
  });
}

// Makes sure `userId` has a valid glitch match, and returns who it is (or null
// when they have none: they are not eligible, or the cohort is too small).
//
// Safe to call as often as you like: a valid stored match is returned as it
// is. The matches page calls this, so someone who finished early gets one
// once the cohort has grown big enough (design 5, "Too few people").
export async function ensureGlitchMatch(
  userId: string,
  random: RandomSource = Math.random,
  db: DbClient = prisma,
): Promise<string | null> {
  const everyone = await getEligiblePeople(db);

  // Slice 9 (#16): a blocked person can't be anyone's surprise match. Also
  // taken out of the "is the stored one still valid" check below, so a match
  // who is blocked later is replaced on the next visit.
  const hiddenIds = await getHiddenUserIds(userId);
  const people = everyone.filter((person) => !hiddenIds.has(person.userId));

  // Someone who isn't eligible has no glitch match. We don't delete one here
  // (that is scoreUser's job); we just don't make a new one.
  if (!people.some((person) => person.userId === userId)) {
    return null;
  }

  const finishedAtByUserId = new Map(people.map((person) => [person.userId, person.completedAt]));
  const edges = await db.edge.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true, score: true },
  });
  const topFiveIds = findTopFiveIds(userId, edges, finishedAtByUserId);

  const stored = await db.glitchMatch.findUnique({ where: { userId } });
  const storedMatchedUserId = stored?.matchedUserId ?? null;

  const chosen = chooseGlitchMatch(
    userId,
    storedMatchedUserId,
    people.map((person) => person.userId),
    topFiveIds,
    random,
  );

  await saveGlitchMatch(db, userId, storedMatchedUserId, chosen);
  return chosen;
}
