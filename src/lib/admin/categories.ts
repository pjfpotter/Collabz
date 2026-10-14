// Admin changes to categories (slice 8, #15, design 2, 3, 4, 5).
//
// Same shape as courses.ts: each function returns a list of plain-English
// problems, and an empty list means it worked. Nothing is deleted. A retired
// category is hidden together with its tags, but the tags keep their own
// `retiredAt`, so un-retiring the category brings back exactly what was there
// before (design 4).
//
// Callers (the Server Actions) check the person is an admin first.
//
// Owner: slice 8 (#15).

import { prisma } from "@/lib/db";

import { findSwapPartner, type MoveDirection } from "./reorder";
import { slugify } from "./slugify";

const NAME_REQUIRED = "Please type a name.";

// A new category lets people pick 1 to 4 tags, the same limits as the seeded
// multi-pick categories (profile-onboarding spec). Changing the limits isn't
// part of this slice.
const DEFAULT_PICK_MIN = 1;
const DEFAULT_PICK_MAX = 4;

export async function addCategory(rawName: string): Promise<string[]> {
  const name = rawName.trim();
  if (name === "") {
    return [NAME_REQUIRED];
  }

  const id = slugify(name);
  if (id === null) {
    return ["Please use a name with at least one letter or number."];
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (existing) {
    return [`A category called "${existing.name}" already exists.`];
  }

  const last = await prisma.category.findFirst({ orderBy: { order: "desc" } });
  const order = (last?.order ?? 0) + 1;

  await prisma.category.create({
    data: { id, name, order, pickMin: DEFAULT_PICK_MIN, pickMax: DEFAULT_PICK_MAX },
  });
  return [];
}

export async function renameCategory(id: string, rawName: string): Promise<string[]> {
  const name = rawName.trim();
  if (name === "") {
    return [NAME_REQUIRED];
  }

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return ["That category doesn't exist."];
  }

  const sameName = await prisma.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
  });
  if (sameName) {
    return [`A category called "${sameName.name}" already exists.`];
  }

  // Only the name changes: the id, the tags and every score stay as they were.
  await prisma.category.update({ where: { id }, data: { name } });
  return [];
}

export async function moveCategory(id: string, direction: MoveDirection): Promise<string[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });

  const partner = findSwapPartner(categories, id, direction);
  if ("problem" in partner) {
    return [partner.problem];
  }
  const { item, neighbour } = partner;

  // One transaction so we never end up with two categories in one place.
  await prisma.$transaction([
    prisma.category.update({ where: { id: item.id }, data: { order: neighbour.order } }),
    prisma.category.update({ where: { id: neighbour.id }, data: { order: item.order } }),
  ]);
  return [];
}

export async function setCategoryRetired(id: string, retired: boolean): Promise<string[]> {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return ["That category doesn't exist."];
  }

  await prisma.category.update({
    where: { id },
    data: { retiredAt: retired ? new Date() : null },
  });
  return [];
}
