// Saves a finished onboarding (slice 2, #9, design decisions 3 and 4).
//
// The onboarding route (src/app/api/onboarding/route.ts) calls this after it
// knows who is signed in. Kept out of the route so the rules can be read and
// tested without thinking about HTTP.
//
// What it does, in order:
//   1. Refuses if the person already has a finished profile.
//   2. Checks the answers against the catalogue (validateOnboardingAnswers).
//   3. Works out their alias and, in ONE transaction, writes the Profile and
//      all its ProfileTag rows. Either everything is saved or nothing is, so
//      there's never a half-saved profile for matching or the graph to trip
//      over.
//   4. After the transaction, rescores them (scoreUser).

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { scoreUser } from "@/lib/scoring";

import { baseAlias, generateAlias } from "./alias";
import { getOnboardingCatalogue, type OnboardingCategory } from "./onboardingCatalogue";
import {
  validateOnboardingAnswers,
  type AnswerProblem,
  type OnboardingAnswers,
} from "./validateAnswers";

// The two categories the alias is built from, by their seeded ids.
const VIBE_CATEGORY_ID = "vibe-diagnosis";
const ENERGY_CATEGORY_ID = "energy";

// How many times to try saving when someone else takes the same alias at the
// same moment. Each retry re-reads the taken aliases, so the next try picks
// the next free numeral. Three is plenty: it would take three people with the
// same Vibe and Energy finishing within the same split second to run out.
const MAX_SAVE_ATTEMPTS = 3;

export type SaveOnboardingResult =
  | { outcome: "saved"; alias: string }
  | { outcome: "already-complete" }
  | { outcome: "invalid"; problems: AnswerProblem[] };

export async function saveOnboarding(
  userId: string,
  answers: OnboardingAnswers,
): Promise<SaveOnboardingResult> {
  const existing = await prisma.profile.findUnique({
    where: { userId },
    select: { completedAt: true, alias: true },
  });
  // Onboarding happens once. Changing answers afterwards is slice 7's
  // /account/edit, which has its own rules.
  if (existing?.completedAt) {
    return { outcome: "already-complete" };
  }

  const catalogue = await getOnboardingCatalogue();
  const problems = validateOnboardingAnswers(answers, catalogue);
  if (problems.length > 0) {
    return { outcome: "invalid", problems };
  }

  // Only the ids of the active catalogue's categories are saved. The check
  // above already refused anything else, so this is the same list as the
  // person's picks, just in a flat form the database wants.
  const tagIds = catalogue.flatMap((category) => answers.picks[category.id] ?? []);

  // The alias words come from the tags they picked. The check above made sure
  // there's exactly one pick in each of these categories (both are
  // "pick exactly 1"), unless an admin has retired the whole category, in
  // which case the fallback words in alias.ts step in.
  const base = baseAlias(
    pickedAliasWord(catalogue, answers, VIBE_CATEGORY_ID),
    pickedAliasWord(catalogue, answers, ENERGY_CATEGORY_ID),
  );

  let alias = "";
  for (let attempt = 1; attempt <= MAX_SAVE_ATTEMPTS; attempt += 1) {
    // A profile left unfinished (an admin's "reset onboarding", slice 8)
    // KEEPS its alias: the spec says an alias is set once and never changes.
    alias = existing?.alias ?? generateAlias(base, await aliasesStartingWith(base));

    try {
      await writeProfile(userId, alias, answers.silhouetteId, tagIds, existing !== null);
      break; // saved
    } catch (error) {
      // P2002 = "unique constraint failed". On this table that means someone
      // else took the same alias between our read and our write, the gap that
      // only the database's unique rule can close (design decision 4). So
      // try again, which re-reads the taken aliases. Anything else is a real
      // error and goes to the caller.
      const aliasTaken =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!aliasTaken || attempt === MAX_SAVE_ATTEMPTS) {
        throw error;
      }
    }
  }

  // AFTER the save, and never able to undo it: the profile is the person's
  // own work, and a scoring problem can be fixed by rescoring later (design
  // decision 3). So a scoring error is logged, not passed on.
  try {
    await scoreUser(userId);
  } catch (error) {
    console.error(`Onboarding saved for ${userId}, but scoring failed:`, error);
  }

  return { outcome: "saved", alias };
}

// The alias word of the tag picked in one category, or null.
function pickedAliasWord(
  catalogue: OnboardingCategory[],
  answers: OnboardingAnswers,
  categoryId: string,
): string | null {
  const pickedId = answers.picks[categoryId]?.[0];
  const category = catalogue.find((candidate) => candidate.id === categoryId);
  const tag = category?.tags.find((candidate) => candidate.id === pickedId);
  return tag?.aliasWord ?? null;
}

// Every alias already in use that could clash with this base: the base
// itself and its numbered versions ("The Feral Sea Captain II", ...).
// "startsWith" also matches longer aliases such as "The Feral Sea Captains",
// which is harmless: generateAlias only cares whether its exact candidates
// are in the list.
async function aliasesStartingWith(base: string): Promise<string[]> {
  const rows = await prisma.profile.findMany({
    where: { alias: { startsWith: base } },
    select: { alias: true },
  });
  return rows.map((row) => row.alias);
}

// Writes the profile and its tags in ONE transaction.
//
// `hasUnfinishedProfile` is true when a profile row already exists without a
// completedAt (after an admin reset). Then its old picks are cleared and the
// row is updated, because creating a second profile for the same user would
// fail (one profile per user).
async function writeProfile(
  userId: string,
  alias: string,
  silhouetteId: string,
  tagIds: string[],
  hasUnfinishedProfile: boolean,
): Promise<void> {
  const completedAt = new Date();
  const tagRows = tagIds.map((tagId) => ({ userId, tagId }));

  if (hasUnfinishedProfile) {
    await prisma.$transaction([
      prisma.profileTag.deleteMany({ where: { userId } }),
      prisma.profile.update({
        where: { userId },
        data: { alias, silhouette: silhouetteId, completedAt },
      }),
      prisma.profileTag.createMany({ data: tagRows }),
    ]);
    return;
  }

  // The profile first, then its tags: a ProfileTag points at its Profile, so
  // the database would refuse the tags if the profile didn't exist yet.
  await prisma.$transaction([
    prisma.profile.create({
      data: { userId, alias, silhouette: silhouetteId, completedAt },
    }),
    prisma.profileTag.createMany({ data: tagRows }),
  ]);
}
