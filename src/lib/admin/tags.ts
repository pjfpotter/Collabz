// Admin changes to tags (slice 8, #15, design 2, 3, 4, 5, 6).
//
// Same shape as courses.ts: each function returns a list of plain-English
// problems, and an empty list means it worked. Tags are never deleted. A
// rename changes only `name`, so the id and every stored score stay put
// (admin spec: "Rename keeps scores").
//
// Callers (the Server Actions) check the person is an admin first.
//
// Owner: slice 8 (#15).

import { prisma } from "@/lib/db";
import { CATEGORY_IDS } from "@/lib/matching/eligiblePeople";

import { findOtherSideTagProblems, pairingRows } from "./pairings";
import { findSwapPartner, type MoveDirection } from "./reorder";
import { slugify } from "./slugify";

const NAME_REQUIRED = "Please type a name.";
const DESCRIPTION_REQUIRED = "Please type a short description.";

// Everything needed to add a tag.
export type NewTag = {
  categoryId: string;
  name: string;
  description: string;
  // Ids of the tags in the OTHER category (Quality for a Seeking tag, Seeking
  // for a Quality tag) that this one pairs with. Required for Seeking and
  // Quality tags, and must be empty for every other category.
  pairedTagIds: string[];
};

export async function addTag(input: NewTag): Promise<string[]> {
  const name = input.name.trim();
  const description = input.description.trim();
  if (name === "") {
    return [NAME_REQUIRED];
  }
  if (description === "") {
    return [DESCRIPTION_REQUIRED];
  }

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) {
    return ["That category doesn't exist."];
  }

  // The id is "<category>-<name>", like the seeded "energy-sea-captain".
  const slug = slugify(name);
  if (slug === null) {
    return ["Please use a name with at least one letter or number."];
  }
  const id = `${category.id}-${slug}`;

  const existing = await prisma.tag.findUnique({ where: { id } });
  if (existing) {
    return [`A tag called "${existing.name}" already exists in this category.`];
  }

  // Seeking and Quality tags must be paired, others must not be. Decided
  // BEFORE writing anything, so a refusal leaves no half-added tag.
  const pairingProblems = await checkNewTagPairing(category.id, input.pairedTagIds);
  if (pairingProblems.length > 0) {
    return pairingProblems;
  }

  const last = await prisma.tag.findFirst({
    where: { categoryId: category.id },
    orderBy: { order: "desc" },
  });
  const order = (last?.order ?? 0) + 1;

  // The tag and its pairings in ONE transaction, so a Seeking or Quality tag
  // can never exist without its pairing (design 6).
  await prisma.$transaction([
    prisma.tag.create({
      data: { id, categoryId: category.id, name, description, order },
    }),
    prisma.tagPairing.createMany({
      data: pairingRows(category.id, id, input.pairedTagIds),
    }),
  ]);
  return [];
}

// Pairing rules for a tag that is about to be added.
async function checkNewTagPairing(categoryId: string, pairedTagIds: string[]): Promise<string[]> {
  const isPairedCategory =
    categoryId === CATEGORY_IDS.seeking || categoryId === CATEGORY_IDS.qualities;

  if (!isPairedCategory) {
    return pairedTagIds.length > 0
      ? ["Only Seeking and Quality tags have pairings."]
      : [];
  }
  if (pairedTagIds.length === 0) {
    return ["Please pick at least one tag it pairs with."];
  }
  return findOtherSideTagProblems(categoryId, pairedTagIds);
}

export async function renameTag(id: string, rawName: string): Promise<string[]> {
  const name = rawName.trim();
  if (name === "") {
    return [NAME_REQUIRED];
  }

  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    return ["That tag doesn't exist."];
  }

  // Two tags with one name in a category would look the same on screen.
  const sameName = await prisma.tag.findFirst({
    where: {
      categoryId: tag.categoryId,
      name: { equals: name, mode: "insensitive" },
      id: { not: id },
    },
  });
  if (sameName) {
    return [`A tag called "${sameName.name}" already exists in this category.`];
  }

  await prisma.tag.update({ where: { id }, data: { name } });
  return [];
}

export async function updateTagDescription(
  id: string,
  rawDescription: string,
): Promise<string[]> {
  const description = rawDescription.trim();
  if (description === "") {
    return [DESCRIPTION_REQUIRED];
  }

  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    return ["That tag doesn't exist."];
  }

  await prisma.tag.update({ where: { id }, data: { description } });
  return [];
}

// Moves a tag one place up or down WITHIN its category.
export async function moveTag(id: string, direction: MoveDirection): Promise<string[]> {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    return ["That tag doesn't exist."];
  }

  const tagsInCategory = await prisma.tag.findMany({
    where: { categoryId: tag.categoryId },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });

  const partner = findSwapPartner(tagsInCategory, id, direction);
  if ("problem" in partner) {
    return [partner.problem];
  }
  const { item, neighbour } = partner;

  await prisma.$transaction([
    prisma.tag.update({ where: { id: item.id }, data: { order: neighbour.order } }),
    prisma.tag.update({ where: { id: neighbour.id }, data: { order: item.order } }),
  ]);
  return [];
}

export async function setTagRetired(id: string, retired: boolean): Promise<string[]> {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    return ["That tag doesn't exist."];
  }

  // Retired, not deleted: profiles and stored scores that use the tag keep
  // pointing at a real row (rule B2).
  await prisma.tag.update({
    where: { id },
    data: { retiredAt: retired ? new Date() : null },
  });
  return [];
}
