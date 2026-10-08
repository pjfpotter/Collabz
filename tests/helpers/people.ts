// Makes hand-made people for the slice 4 (#11) integration tests.
//
// WHY NOT USE THE PRETEND COHORT IN THESE TESTS: it has 30 people with
// "random" scores, so the expected answer to "who are the top 5?" isn't
// obvious from reading the test. A handful of people made here, with scores
// the test sets itself, makes every expected answer plain to see.

import type { PrismaClient } from "@/generated/prisma/client";
import { orderUserPair } from "@/lib/userPair";

type CreatePersonOptions = {
  // "software" or "business". Defaults to "software".
  courseId?: string;
  // When they finished their profile. Pass null for a profile that was
  // started but never finished. Defaults to 1 January 2026.
  finishedAt?: Date | null;
  // true for a suspended user.
  suspended?: boolean;
  // Ids of the tags they picked. Each must exist in the catalogue.
  tagIds?: string[];
};

// Creates one user with a profile and returns the user's id.
//
// `name` should be one short lower-case word, different for each person in a
// test. It appears in everything, so a failing test is easy to read:
// id "test-user-anna", email "anna@cohort-test.test", alias "The Test anna".
export async function createPerson(
  prisma: PrismaClient,
  name: string,
  options: CreatePersonOptions = {},
): Promise<string> {
  // `=== undefined` and not `??`, because null is a real choice here
  // ("not finished") and `??` would replace it with the default.
  const finishedAt =
    options.finishedAt === undefined ? new Date("2026-01-01T00:00:00Z") : options.finishedAt;

  const user = await prisma.user.create({
    data: {
      id: `test-user-${name}`,
      email: `${name}@cohort-test.test`,
      courseId: options.courseId ?? "software",
      suspendedAt: options.suspended ? new Date() : null,
      profile: {
        create: {
          alias: `The Test ${name}`,
          silhouette: "silhouette-01",
          completedAt: finishedAt,
          tags: {
            create: (options.tagIds ?? []).map((tagId) => ({ tagId })),
          },
        },
      },
    },
  });
  return user.id;
}

// Stores a score between two people. The ids can be passed either way round:
// orderUserPair puts them in the order the Edge table needs.
//
// `parts` are the three numbers the score is made of. They default to zero,
// which is fine for tests that only care about the total.
export async function createScore(
  prisma: PrismaClient,
  firstUserId: string,
  secondUserId: string,
  score: number,
  parts: { complement?: number; overlap?: number; tension?: number } = {},
): Promise<void> {
  await prisma.edge.create({
    data: {
      ...orderUserPair(firstUserId, secondUserId),
      score,
      complement: parts.complement ?? 0,
      overlap: parts.overlap ?? 0,
      tension: parts.tension ?? 0,
    },
  });
}
