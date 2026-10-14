// Saving an edit to one category of someone's answers (slice 7, #14, design
// decision 6; account-management spec: "Account page").
//
//   1. check the picks with the same rules as onboarding (checkEditedPicks),
//   2. in ONE transaction, replace this person's picks in this category,
//   3. AFTER it has saved, rescore them (scoreUser, slice 3).
//
// Why rescore after, and never let it undo the save: the edit is the
// person's own work. A scoring problem mustn't throw it away, and scoring
// can simply be run again (the same reason as slice 2's onboarding save).
//
// What this does NOT change: the alias (set once, at onboarding), requests,
// connections or conversations. The glitch match stays the same too, unless
// the edit puts it in the person's new top 5; then scoreUser replaces it, as
// chemistry-matching requires.
//
// Owner: slice 7 (#14).

import { prisma } from "@/lib/db";
import { scoreUser } from "@/lib/scoring";

import { getEditableCategory } from "./editCatalogue";
import { SILHOUETTE_CATEGORY_ID, checkEditedPicks } from "./standIns";

export type SaveEditResult = { ok: true } | { ok: false; problem: string };

// `rescore` is only swapped by tests; normal callers leave it out.
export async function saveCategoryEdit(
  userId: string,
  categoryId: string,
  picks: string[],
  rescore: (userId: string) => Promise<void> = scoreUser,
): Promise<SaveEditResult> {
  const toEdit = await getEditableCategory(categoryId, userId);
  if (!toEdit) {
    return { ok: false, problem: "There's nothing to edit there." };
  }

  const problem = checkEditedPicks(picks, toEdit.category, toEdit.alreadyPicked);
  if (problem) {
    // Nothing is saved.
    return { ok: false, problem };
  }

  // The silhouette is stored on the profile, and isn't part of the score,
  // so there's nothing to rescore.
  if (categoryId === SILHOUETTE_CATEGORY_ID) {
    await prisma.profile.update({ where: { userId }, data: { silhouette: picks[0] } });
    return { ok: true };
  }

  // Delete-then-insert inside one transaction: either both happen or
  // neither does, so nobody is ever left with no picks in a category.
  await prisma.$transaction([
    prisma.profileTag.deleteMany({ where: { userId, tag: { categoryId } } }),
    prisma.profileTag.createMany({ data: picks.map((tagId) => ({ userId, tagId })) }),
  ]);

  try {
    await rescore(userId);
  } catch (error) {
    // The edit is saved; only the scores are out of date until the next
    // rescore. Logged so it can be found and rerun.
    console.error(`Rescoring ${userId} after an edit failed:`, error);
  }
  return { ok: true };
}
