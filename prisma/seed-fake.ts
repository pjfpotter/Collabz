// Saves the PRETEND COHORT to the database: `npm run seed:fake`.
//
// The cohort itself (who the 32 pretend students are, their scores, requests
// and so on) is worked out in prisma/pretend-cohort.ts. This file only checks
// it is allowed to run, and then saves what that file built.
//
// Two ways this file is used:
// 1. As a command: `npm run seed:fake`, run by hand against the dev database.
// 2. By the tests, which import seedPretendCohort() and call it with a client
//    connected to the test database.
//
// WHY THIS IS A SEPARATE FILE FROM prisma/seed.ts: that seed runs on EVERY
// deploy, including production, to keep the tag catalogue up to date. Pretend
// students must never reach production, so they live in a different file
// behind a different command, and the production build never even loads it
// (foundation design decision 6).
//
// It is safe to run any number of times. Like the catalogue seed, it only
// ADDS rows that are missing and never changes or deletes existing ones. So
// if you approved a pretend request by hand to test something, it stays
// approved after a re-seed.
//
// Join-up (#17) deletes this file together with the switcher.

// Loads .env when run on a laptop.
import "dotenv/config";

import type { PrismaClient } from "../src/generated/prisma/client";
import { PRETEND_USER_ID_PREFIX, isPretendCohortEnabled } from "../src/lib/pretendCohort";
import {
  buildPretendCohort,
  pickTagsFor,
  type CohortCatalogue,
} from "./pretend-cohort";

// How many new rows each table got. Useful in the log, and in tests (a second
// run should create 0 of everything).
export type PretendSeedResult = {
  usersCreated: number;
  profilesCreated: number;
  profileTagsCreated: number;
  edgesCreated: number;
  glitchMatchesCreated: number;
  connectionRequestsCreated: number;
  conversationsCreated: number;
  messagesCreated: number;
  blocksCreated: number;
  reportsCreated: number;
};

export async function seedPretendCohort(prisma: PrismaClient): Promise<PretendSeedResult> {
  // The safety check comes first, before anything is read or written.
  if (!isPretendCohortEnabled()) {
    throw new Error(
      "The pretend cohort is switched off here, so nothing was created. " +
        'It only runs where PRETEND_COHORT is set to exactly "on" (add ' +
        'PRETEND_COHORT="on" to your local .env), and it never runs on the ' +
        "production deployment. See src/lib/pretendCohort.ts for why.",
    );
  }

  const catalogue = await loadActiveCatalogue(prisma);
  if (catalogue.categories.length === 0 || catalogue.courseIds.length === 0) {
    throw new Error(
      "The catalogue is empty, so there are no tags or courses to build " +
        "pretend profiles from. Run `npx prisma db seed` first, then try again.",
    );
  }

  const cohort = buildPretendCohort(catalogue);

  // The order below matters: a row can only be saved once the rows it points
  // at exist. Users first (everything points at them), then profiles, and so
  // on. It is the reverse of the deleting order in tests/helpers/database.ts.
  //
  // `skipDuplicates: true` is what makes re-running safe: a row whose id is
  // already in the table is skipped instead of failing or being overwritten.
  const users = await prisma.user.createMany({
    data: cohort.users,
    skipDuplicates: true,
  });
  const profiles = await prisma.profile.createMany({
    data: cohort.profiles,
    skipDuplicates: true,
  });

  // Picked tags are handled differently from everything else: see the
  // function's own comment for why.
  const profileTagsCreated = await fillCategoriesWithNoPicks(prisma, catalogue);

  const edges = await prisma.edge.createMany({
    data: cohort.edges,
    skipDuplicates: true,
  });
  const glitchMatches = await prisma.glitchMatch.createMany({
    data: cohort.glitchMatches,
    skipDuplicates: true,
  });
  const connectionRequests = await prisma.connectionRequest.createMany({
    data: cohort.connectionRequests,
    skipDuplicates: true,
  });
  const conversations = await prisma.conversation.createMany({
    data: cohort.conversations,
    skipDuplicates: true,
  });
  const messages = await prisma.message.createMany({
    data: cohort.messages,
    skipDuplicates: true,
  });
  const blocks = await prisma.block.createMany({
    data: cohort.blocks,
    skipDuplicates: true,
  });
  const reports = await prisma.report.createMany({
    data: cohort.reports,
    skipDuplicates: true,
  });

  return {
    usersCreated: users.count,
    profilesCreated: profiles.count,
    profileTagsCreated,
    edgesCreated: edges.count,
    glitchMatchesCreated: glitchMatches.count,
    connectionRequestsCreated: connectionRequests.count,
    conversationsCreated: conversations.count,
    messagesCreated: messages.count,
    blocksCreated: blocks.count,
    reportsCreated: reports.count,
  };
}

// Reads the part of the catalogue the cohort is built from: categories and
// tags that are in use (not retired), in display order, and the courses.
async function loadActiveCatalogue(prisma: PrismaClient): Promise<CohortCatalogue> {
  const categories = await prisma.category.findMany({
    where: { retiredAt: null },
    orderBy: { order: "asc" },
    include: {
      tags: { where: { retiredAt: null }, orderBy: { order: "asc" } },
    },
  });
  const courses = await prisma.course.findMany({
    where: { retiredAt: null },
    orderBy: { order: "asc" },
  });

  return {
    categories: categories.map((category) => ({
      id: category.id,
      pickMin: category.pickMin,
      pickMax: category.pickMax,
      tags: category.tags.map((tag) => ({ id: tag.id, name: tag.name })),
    })),
    courseIds: courses.map((course) => course.id),
  };
}

// Gives each pretend profile its picked tags, one category at a time, but
// ONLY in categories where that profile has no picks at all. Returns how many
// picks were added.
//
// On the first run every category is empty for everyone, so this creates all
// the picks. On later runs it does nothing, unless the catalogue has gained a
// category since: then every pretend profile gets picks in the new one.
//
// Why that matters: slice 2 (#9) adds the Skills and Interests categories
// AFTER this slice is merged. Without this, existing pretend profiles would
// have no skills, and track 4's skill filter would have nothing to find.
//
// Why not simply insert the cohort's picks with skipDuplicates, like the
// other tables: if a tag had been retired or added since the first run, the
// "random" picks for that category would come out differently, and inserting
// them would pile extra tags on top of a profile's existing ones, pushing it
// over the category's pick limit. Only ever filling an EMPTY category can't
// do that.
async function fillCategoriesWithNoPicks(
  prisma: PrismaClient,
  catalogue: CohortCatalogue,
): Promise<number> {
  // Every pretend profile, with the tags it already has and which category
  // each of those tags belongs to.
  const pretendProfiles = await prisma.profile.findMany({
    where: { userId: { startsWith: PRETEND_USER_ID_PREFIX } },
    include: { tags: { include: { tag: true } } },
  });

  const picksToAdd: { userId: string; tagId: string }[] = [];

  for (const profile of pretendProfiles) {
    // The ids of the categories this profile already has at least one pick in.
    const categoriesWithPicks = new Set(
      profile.tags.map((profileTag) => profileTag.tag.categoryId),
    );

    for (const category of catalogue.categories) {
      if (categoriesWithPicks.has(category.id)) continue;

      for (const tagId of pickTagsFor(profile.userId, category)) {
        picksToAdd.push({ userId: profile.userId, tagId });
      }
    }
  }

  const created = await prisma.profileTag.createMany({
    data: picksToAdd,
    skipDuplicates: true,
  });
  return created.count;
}

// Runs the seed when this file is started as a command (`npm run seed:fake`
// runs `tsx prisma/seed-fake.ts`), but NOT when a test imports
// seedPretendCohort. Same approach as prisma/seed.ts.
async function main() {
  // Imported here, not at the top, so tests that only import
  // seedPretendCohort don't create the app's shared client.
  const { prisma } = await import("../src/lib/db");

  try {
    const result = await seedPretendCohort(prisma);
    console.log(
      "Pretend cohort seeded. New rows: " +
        `${result.usersCreated} users, ${result.profilesCreated} profiles, ` +
        `${result.profileTagsCreated} picked tags, ${result.edgesCreated} scores, ` +
        `${result.glitchMatchesCreated} glitch matches, ` +
        `${result.connectionRequestsCreated} requests, ` +
        `${result.conversationsCreated} conversations, ${result.messagesCreated} messages, ` +
        `${result.blocksCreated} blocks, ${result.reportsCreated} reports ` +
        "(existing rows are left as they are).",
    );
  } finally {
    // Close the database connection so the command can exit.
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed-fake.ts")) {
  main().catch((error) => {
    // Print just the message for our own "switched off" and "catalogue is
    // empty" errors: a full stack trace would bury the explanation.
    console.error("Pretend cohort seed failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
