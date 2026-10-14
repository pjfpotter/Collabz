"use server";
// The Server Actions behind /admin/categories (slice 8, #15, design 1, 6, 9).
//
// EVERY action calls requireAdmin() as its first line. A Server Action is a
// public address anyone can post to, so it can't rely on the page that showed
// the form having checked (design 1).
//
// After a change we refresh /catalogue as well as the admin page, so a rename
// or retire shows there straight away (success check on #15).

import { addCategory, moveCategory, renameCategory, setCategoryRetired } from "@/lib/admin/categories";
import { setTagPairings } from "@/lib/admin/pairings";
import { rescoreEveryoneNow } from "@/lib/admin/rescoreEveryone";
import {
  addTag,
  moveTag,
  renameTag,
  setTagRetired,
  updateTagDescription,
} from "@/lib/admin/tags";
import { requireAdmin } from "@/lib/currentUser";

import { redirectBack } from "../redirectBack";

const PAGE = "/admin/categories";
// Pages that show the catalogue and must not keep serving an old copy.
const REFRESH = ["/catalogue"];

// Reads a form field as plain text ("" if missing).
function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

// Reads "up" or "down", anything else is refused.
function direction(formData: FormData): "up" | "down" | null {
  const value = text(formData, "direction");
  return value === "up" || value === "down" ? value : null;
}

export async function addCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  redirectBack(PAGE, REFRESH, await addCategory(text(formData, "name")));
}

export async function renameCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  redirectBack(PAGE, REFRESH, await renameCategory(text(formData, "id"), text(formData, "name")));
}

export async function moveCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const way = direction(formData);
  if (!way) {
    redirectBack(PAGE, REFRESH, ["That isn't a direction."]);
  }
  redirectBack(PAGE, REFRESH, await moveCategory(text(formData, "id"), way));
}

export async function setCategoryRetiredAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const retired = text(formData, "retired") === "true";
  redirectBack(PAGE, REFRESH, await setCategoryRetired(text(formData, "id"), retired));
}

export async function addTagAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const problems = await addTag({
    categoryId: text(formData, "categoryId"),
    name: text(formData, "name"),
    description: text(formData, "description"),
    // One tick box per possible partner, all named "paired".
    pairedTagIds: formData.getAll("paired").map(String),
  });
  redirectBack(PAGE, REFRESH, problems);
}

export async function renameTagAction(formData: FormData): Promise<void> {
  await requireAdmin();
  redirectBack(PAGE, REFRESH, await renameTag(text(formData, "id"), text(formData, "name")));
}

export async function updateTagDescriptionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const problems = await updateTagDescription(text(formData, "id"), text(formData, "description"));
  redirectBack(PAGE, REFRESH, problems);
}

export async function moveTagAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const way = direction(formData);
  if (!way) {
    redirectBack(PAGE, REFRESH, ["That isn't a direction."]);
  }
  redirectBack(PAGE, REFRESH, await moveTag(text(formData, "id"), way));
}

export async function setTagRetiredAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const retired = text(formData, "retired") === "true";
  redirectBack(PAGE, REFRESH, await setTagRetired(text(formData, "id"), retired));
}

export async function setTagPairingsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const problems = await setTagPairings(
    text(formData, "id"),
    formData.getAll("paired").map(String),
  );
  // Scores don't change until "Rescore everyone", so say so (design 9).
  redirectBack(PAGE, REFRESH, problems);
}

export async function rescoreEveryoneAction(): Promise<void> {
  await requireAdmin();
  const count = await rescoreEveryoneNow();
  const people = count === 1 ? "1 person" : `${count} people`;
  redirectBack(PAGE, REFRESH, [], `Rescored ${people}.`);
}
