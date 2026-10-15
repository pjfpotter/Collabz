// Checks a set of onboarding answers before anything is saved (slice 2, #9,
// design decision 3).
//
// WHY THE SERVER CHECKS AGAIN when the page already stops you picking too
// many: anyone can send a request by hand, without the page. This is the
// rule that protects the data, so it runs on the server for every save.
//
// WHY IT'S A PURE FUNCTION (no database inside): it can be tested quickly
// without a browser or a database, and slice 7 (editing answers) can reuse
// it. The caller loads the catalogue and passes it in.

import { isSilhouetteId } from "./silhouettes";

// What the browser sends: the picked tag ids for each category, and the
// silhouette, e.g.
//   { picks: { "hero-story": ["hero-story-late-bloomer"], ... },
//     silhouetteId: "silhouette-03" }
export type OnboardingAnswers = {
  picks: Record<string, string[]>;
  silhouetteId: string;
};

// The part of the catalogue the check needs: each ACTIVE category with its
// limits and its ACTIVE tag ids. Retired categories and tags are left out by
// whoever builds this (getOnboardingCatalogue), so "not in here" covers
// "retired", "made up" and "belongs to another category" all at once.
export type CatalogueForChecking = {
  id: string;
  name: string;
  pickMin: number;
  pickMax: number;
  tags: { id: string }[];
}[];

// One thing that's wrong. `step` says which step to send the person back to:
// a category id, or "silhouette".
export type AnswerProblem = {
  step: string;
  message: string;
};

export const SILHOUETTE_STEP = "silhouette";

// Returns every problem found, in step order. An empty list means the answers
// can be saved.
export function validateOnboardingAnswers(
  answers: OnboardingAnswers,
  catalogue: CatalogueForChecking,
): AnswerProblem[] {
  const problems: AnswerProblem[] = [];

  for (const category of catalogue) {
    // A category the browser sent nothing for counts as zero picks, so it
    // fails the minimum below rather than being skipped.
    const picks = answers.picks[category.id] ?? [];
    const problem = checkOneCategory(picks, category);
    if (problem) {
      problems.push({ step: category.id, message: problem });
    }
  }

  // Picks for a category that isn't in the catalogue (retired, or made up).
  // Nothing could be saved for them, so say so rather than drop them quietly.
  const knownCategoryIds = new Set(catalogue.map((category) => category.id));
  for (const [categoryId, picks] of Object.entries(answers.picks)) {
    if (!knownCategoryIds.has(categoryId) && picks.length > 0) {
      problems.push({
        step: categoryId,
        message: "That question isn't part of onboarding any more.",
      });
    }
  }

  if (!isSilhouetteId(answers.silhouetteId)) {
    problems.push({ step: SILHOUETTE_STEP, message: "Pick a silhouette." });
  }

  return problems;
}

// What's wrong with one category's picks, or null if nothing is.
function checkOneCategory(
  picks: string[],
  category: CatalogueForChecking[number],
): string | null {
  // The same tag twice would be saved once (ProfileTag's id is user + tag),
  // which could quietly drop someone below the minimum. So refuse it.
  if (new Set(picks).size !== picks.length) {
    return "Each tag can only be picked once.";
  }

  // Every pick must be one of this category's active tags. A tag from
  // another category, a retired tag and a made-up id all fail here.
  const activeTagIds = new Set(category.tags.map((tag) => tag.id));
  for (const tagId of picks) {
    if (!activeTagIds.has(tagId)) {
      return `That isn't one of the ${category.name} choices.`;
    }
  }

  if (picks.length < category.pickMin || picks.length > category.pickMax) {
    return pickLimitMessage(category);
  }
  return null;
}

// "Pick exactly 1." or "Pick between 1 and 4." Shared with the page, so the
// browser and the server describe a limit in the same words.
export function pickLimitMessage(category: { pickMin: number; pickMax: number }): string {
  if (category.pickMin === category.pickMax) {
    return `Pick exactly ${category.pickMin}.`;
  }
  return `Pick between ${category.pickMin} and ${category.pickMax}.`;
}
