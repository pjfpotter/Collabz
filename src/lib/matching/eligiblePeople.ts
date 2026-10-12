// WHO CAN BE SCORED (slice 3, #10, design decision 6).
//
// A person is eligible when:
//
//   1. they have FINISHED their profile (Profile.completedAt has a date), and
//   2. they are NOT suspended (User.suspendedAt is empty).
//
// Everyone else has no scores, is in nobody's top 5 and is nobody's glitch
// match (spec: "Only finished, active profiles are scored").
//
// THIS RULE IS WRITTEN TWICE ON PURPOSE. Slice 4 has the same rule in
// src/lib/cohort/visiblePeople.ts (getVisiblePeople). CLAUDE.md says tracks
// reach each other only through the shared helpers, never by importing
// internals, so this slice keeps its own small copy rather than reaching in.
// The cost is that the two could drift apart, so a test pins this one, and
// join-up (#17) can merge them. If you change the rule here, change it there.

import { prisma } from "@/lib/db";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import type { PersonTags } from "./score";

// Either the normal database client or the one handed to us inside a
// transaction. Both can run the same queries, so functions that may be used
// in either place take this. (Inside a transaction we MUST use the transaction's
// client, or our queries would run outside it.)
export type DbClient = PrismaClient | Prisma.TransactionClient;

// The catalogue category ids (prisma/seed-data.ts). Written once here so no
// other file has to spell them. Skills and Interests are added by slice 2;
// until then nobody has tags in them and those lists are simply empty.
export const CATEGORY_IDS = {
  heroStory: "hero-story",
  energy: "energy",
  vibeDiagnosis: "vibe-diagnosis",
  qualities: "qualities",
  seeking: "seeking",
  skills: "skills",
  interests: "interests",
} as const;

// One eligible person, with their tags grouped the way the formula wants.
export type EligiblePerson = {
  userId: string;
  // When they finished their profile. Breaks ties between equal scores.
  completedAt: Date;
  tags: PersonTags;
};

// Loads every eligible person with the tags they picked, ordered by user id
// so the result is the same every time.
//
// WHY EVERYONE AT ONCE: a cohort is about 30 to 100 people, so loading them
// all and working in plain code is easy to read and takes milliseconds.
export async function getEligiblePeople(db: DbClient = prisma): Promise<EligiblePerson[]> {
  const profiles = await db.profile.findMany({
    where: {
      completedAt: { not: null },
      user: { suspendedAt: null },
    },
    orderBy: { userId: "asc" },
    select: {
      userId: true,
      completedAt: true,
      // Retired tags are NOT left out: a retired tag stays on the profiles
      // that already picked it, so scores don't change by accident (rule B2).
      tags: { select: { tagId: true, tag: { select: { categoryId: true } } } },
    },
  });

  return profiles.map((profile) => ({
    userId: profile.userId,
    // `where` above guarantees a date, but TypeScript can't see that, so
    // this check is also what narrows the type from "Date or null" to Date.
    completedAt: profile.completedAt as Date,
    tags: groupTagsByCategory(profile.tags),
  }));
}

// Sorts a person's picked tags into the lists the formula uses.
function groupTagsByCategory(
  picked: { tagId: string; tag: { categoryId: string } }[],
): PersonTags {
  const idsIn = (categoryId: string): string[] =>
    picked.filter((pick) => pick.tag.categoryId === categoryId).map((pick) => pick.tagId);

  return {
    heroStory: idsIn(CATEGORY_IDS.heroStory),
    energy: idsIn(CATEGORY_IDS.energy),
    vibeDiagnosis: idsIn(CATEGORY_IDS.vibeDiagnosis),
    qualities: idsIn(CATEGORY_IDS.qualities),
    seeking: idsIn(CATEGORY_IDS.seeking),
    skills: idsIn(CATEGORY_IDS.skills),
    interests: idsIn(CATEGORY_IDS.interests),
  };
}
