// RESCORING ONE USER (slice 3, #10, design decision 4).
//
// rescoreUser() is the real work behind scoreUser() in src/lib/scoring.ts. It
// is split out so tests can pass in a repeatable "random" source for the
// glitch match; scoreUser() just calls it with Math.random.
//
// WHAT IT DOES, all inside ONE database transaction:
//
//   1. loads every eligible person (finished, not suspended) and the pairings,
//   2. deletes this user's rows in the Edge table,
//   3. scores them against everyone else eligible and writes the new rows,
//   4. makes sure they have a valid glitch match,
//   5. replaces any glitch match, anyone's, that has stopped being valid.
//
// NOBODY ELSE'S SCORES CHANGE. Only rows that involve this user are deleted
// and rewritten. A pair's row is the same row for both people, so it is
// recalculated when EITHER of them is rescored (both give the same answer).
//
// WHY ONE TRANSACTION: a failure halfway must not leave a person with half
// their scores, or with no scores at all. Either all of the changes happen or
// none do. (Callers still call scoreUser AFTER saving their own work, so a
// scoring problem can never undo what the person saved.)
//
// WHY IN MEMORY: at 30 to 100 people that is a few thousand rows and takes
// milliseconds, and the code reads top to bottom. See design decision 4.

// Relative path, not "@/lib/db", on purpose: prisma/seed-fake.ts scores the
// pretend cohort through this file, and a seed script and Playwright's test
// runner don't understand the "@/" shortcut the Next.js app uses.
import { prisma } from "../db";
import type { PrismaClient } from "../../generated/prisma/client";
import { orderUserPair } from "../userPair";

import type { DbClient } from "./eligiblePeople";
import { getEligiblePeople, type EligiblePerson } from "./eligiblePeople";
import { chooseGlitchMatch, saveGlitchMatch, type RandomSource } from "./glitch";
import { calculateScore, type Pairing } from "./score";
import { findTopFiveIds } from "./topFive";

// How long the transaction may take before the database gives up on it. The
// default is 5 seconds, which a cold Neon connection plus a few thousand rows
// could come close to. Twenty is generous but still stops a hung request.
const TRANSACTION_TIMEOUT_MS = 20_000;

// `client` is the database to work on. Normal callers leave it out and get
// the app's shared client. The pretend-cohort seed passes the client it was
// given, so it scores the same database it just filled (the tests' database
// is chosen by TEST_DATABASE_URL, not by the app's DATABASE_URL).
export async function rescoreUser(
  userId: string,
  random: RandomSource = Math.random,
  client: PrismaClient = prisma,
): Promise<void> {
  await client.$transaction(
    async (transaction) => {
      const people = await getEligiblePeople(transaction);
      const pairings: Pairing[] = await transaction.tagPairing.findMany({
        select: { seekingTagId: true, qualityTagId: true },
      });
      const me = people.find((person) => person.userId === userId);

      // Step 2: the old scores go, whoever's side of the row this user is on.
      await transaction.edge.deleteMany({
        where: { OR: [{ userAId: userId }, { userBId: userId }] },
      });

      if (me) {
        await writeNewEdges(transaction, me, people, pairings);
      } else {
        // Not eligible (unfinished or suspended): no scores and no glitch
        // match. They are also left out of everyone else's results because
        // every read goes through the eligible list.
        await transaction.glitchMatch.deleteMany({ where: { userId } });
      }

      // Steps 4 and 5.
      await repairGlitchMatches(transaction, people, [userId], random);
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );
}

// Scores `me` against every other eligible person and stores the rows.
async function writeNewEdges(
  transaction: DbClient,
  me: EligiblePerson,
  people: EligiblePerson[],
  pairings: Pairing[],
): Promise<void> {
  const rows = people
    .filter((other) => other.userId !== me.userId)
    .map((other) => ({
      // The lower user id goes first: one row per pair (src/lib/userPair.ts).
      ...orderUserPair(me.userId, other.userId),
      ...calculateScore(me.tags, other.tags, pairings),
    }));

  if (rows.length === 0) {
    return; // the only eligible person has nobody to be scored against yet
  }

  // skipDuplicates: if the OTHER person is being rescored at the same moment,
  // both of you write the same pair's row. Both compute it from the same
  // answers, so the values are equal and ignoring the second write is right.
  await transaction.edge.createMany({ data: rows, skipDuplicates: true });
}

// Gives the rescored user a glitch match if they need one, and replaces any
// stored glitch match (anyone's) that has stopped being valid.
//
// WHY EVERYONE'S: rescoring this user can push them into someone else's top
// 5, and they may be that person's glitch match. A glitch match must never be
// in the top 5, so the other person's has to change. Rather than hunt for
// exactly who is affected, every stored glitch match is simply checked (a few
// dozen rows) and rewritten only if it is no longer valid.
//
// People who have NO glitch match are left alone, except for the rescored
// user(s): a rescore doesn't hand out glitch matches to the whole cohort.
async function repairGlitchMatches(
  transaction: DbClient,
  people: EligiblePerson[],
  rescoredUserIds: string[],
  random: RandomSource,
): Promise<void> {
  const eligibleIds = people.map((person) => person.userId);
  const finishedAtByUserId = new Map(people.map((person) => [person.userId, person.completedAt]));

  const [edges, storedMatches] = await Promise.all([
    transaction.edge.findMany({ select: { userAId: true, userBId: true, score: true } }),
    transaction.glitchMatch.findMany(),
  ]);
  const storedByOwner = new Map(storedMatches.map((row) => [row.userId, row.matchedUserId]));

  // Whose glitch match to look at: everyone who has one, plus the rescored
  // user. An owner who is no longer eligible is skipped: nobody sees their
  // glitch match, and they get a fresh one if they come back.
  const owners = new Set([...storedByOwner.keys(), ...rescoredUserIds]);

  for (const ownerId of owners) {
    if (!finishedAtByUserId.has(ownerId)) {
      continue;
    }
    const stored = storedByOwner.get(ownerId) ?? null;
    const topFiveIds = findTopFiveIds(ownerId, edges, finishedAtByUserId);
    const chosen = chooseGlitchMatch(ownerId, stored, eligibleIds, topFiveIds, random);
    await saveGlitchMatch(transaction, ownerId, stored, chosen);
  }
}

// RESCORING EVERYONE AT ONCE (used by `npm run rescore:all` and the
// pretend-cohort seed).
//
// Same result as calling rescoreUser() for each person, but in ONE
// transaction: delete every edge, score every pair once, write them in one
// go. WHY NOT JUST LOOP OVER rescoreUser: each call is its own round trip to
// the database, and 30 of them made the seed too slow for its tests.
//
// Returns how many people were scored.
export async function rescoreEveryone(
  random: RandomSource = Math.random,
  client: PrismaClient = prisma,
): Promise<number> {
  return client.$transaction(
    async (transaction) => {
      const people = await getEligiblePeople(transaction);
      const pairings: Pairing[] = await transaction.tagPairing.findMany({
        select: { seekingTagId: true, qualityTagId: true },
      });

      // Everyone's rows go, including anyone no longer eligible (suspended or
      // unfinished): they must have no scores.
      await transaction.edge.deleteMany();

      // Each pair once: person i against every person after them in the list.
      const rows = [];
      for (let i = 0; i < people.length; i++) {
        for (let j = i + 1; j < people.length; j++) {
          rows.push({
            ...orderUserPair(people[i].userId, people[j].userId),
            ...calculateScore(people[i].tags, people[j].tags, pairings),
          });
        }
      }
      if (rows.length > 0) {
        await transaction.edge.createMany({ data: rows });
      }

      await repairGlitchMatches(
        transaction,
        people,
        people.map((person) => person.userId),
        random,
      );
      return people.length;
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );
}
