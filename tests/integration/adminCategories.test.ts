// Tests for the admin category functions (slice 8, #15, task 2.1) against the
// real test database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  addCategory,
  moveCategory,
  renameCategory,
  setCategoryRetired,
} from "@/lib/admin/categories";
import { getCatalogue } from "@/lib/catalogue";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";

beforeEach(async () => {
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("addCategory", () => {
  it("adds a category last, picking 1 to 4 tags, with an id from its name", async () => {
    expect(await addCategory(" Hobbies ")).toEqual([]);

    const category = await prisma.category.findUniqueOrThrow({ where: { id: "hobbies" } });
    expect(category.name).toBe("Hobbies");
    expect(category.pickMin).toBe(1);
    expect(category.pickMax).toBe(4);
    // The seed has 7 categories (orders 1 to 7), so the new one is 8th.
    expect(category.order).toBe(8);
  });

  it("refuses an empty name and a name that is already used", async () => {
    expect(await addCategory("  ")).toHaveLength(1);
    expect(await addCategory("Energy")).toHaveLength(1);
    expect(await prisma.category.count()).toBe(7);
  });
});

describe("renameCategory", () => {
  it("changes the name only: id and tags stay", async () => {
    const tagsBefore = await prisma.tag.count({ where: { categoryId: "energy" } });

    expect(await renameCategory("energy", "Your Energy")).toEqual([]);

    const category = await prisma.category.findUniqueOrThrow({ where: { id: "energy" } });
    expect(category.name).toBe("Your Energy");
    expect(await prisma.tag.count({ where: { categoryId: "energy" } })).toBe(tagsBefore);
  });

  it("refuses a name another category has, ignoring capitals", async () => {
    expect(await renameCategory("energy", "seeking")).toHaveLength(1);
  });
});

describe("setCategoryRetired", () => {
  it("hides the category and its tags from the catalogue", async () => {
    expect(await setCategoryRetired("energy", true)).toEqual([]);

    const catalogue = await getCatalogue();
    expect(catalogue.map((category) => category.id)).not.toContain("energy");
  });

  it("brings back the same tags when un-retired, leaving a retired tag retired", async () => {
    // One tag was already retired on its own before the category was.
    await prisma.tag.update({
      where: { id: "energy-sea-captain" },
      data: { retiredAt: new Date() },
    });
    const before = (await getCatalogue()).find((category) => category.id === "energy");

    await setCategoryRetired("energy", true);
    await setCategoryRetired("energy", false);

    const after = (await getCatalogue()).find((category) => category.id === "energy");
    expect(after).toEqual(before);
    expect(after?.tags.map((tag) => tag.id)).not.toContain("energy-sea-captain");
  });
});

describe("moveCategory", () => {
  it("swaps places with the neighbour", async () => {
    // Seeded order: hero-story, energy, vibe-diagnosis, qualities, seeking,
    // skills, interests.
    expect(await moveCategory("energy", "up")).toEqual([]);

    const catalogue = await getCatalogue();
    expect(catalogue.slice(0, 2).map((category) => category.id)).toEqual([
      "energy",
      "hero-story",
    ]);
  });

  it("says so when there is nowhere to move", async () => {
    expect(await moveCategory("hero-story", "up")).toHaveLength(1);
    expect(await moveCategory("interests", "down")).toHaveLength(1);
  });
});
