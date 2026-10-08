// Tests for prisma/seed.ts against the real test database.
// One test per scenario in the spec's "Categories, tags and courses are
// stored as data" requirement (openspec/specs/tag-catalogue/spec.md).

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { seedCatalogue } from "../../prisma/seed";
import { seedCategories } from "../../prisma/seed-data";
import { emptyCatalogueTables } from "../helpers/database";

describe("seedCatalogue", () => {
  // Every test starts from empty tables, so tests can't affect each other.
  beforeEach(async () => {
    await emptyCatalogueTables(prisma);
  });

  // Leave the test database the way the app expects it: freshly seeded, with
  // no renamed tags left behind by the tests below.
  afterAll(async () => {
    await emptyCatalogueTables(prisma);
    await seedCatalogue(prisma);
    await prisma.$disconnect();
  });

  // Spec scenario: "Fresh database is seeded"
  it("fills an empty database with 5 categories of 12 tags, in order, plus 2 courses", async () => {
    await seedCatalogue(prisma);

    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { tags: { orderBy: { order: "asc" } } },
    });

    // The five categories from the brief, in the brief's order.
    expect(categories.map((category) => category.name)).toEqual([
      "Hero Story",
      "Energy",
      "Vibe Diagnosis",
      "Qualities",
      "Seeking",
    ]);

    // Each category has its 12 tags with names and descriptions, in the same
    // order as seed-data.ts (which was checked line by line against the brief).
    categories.forEach((category, index) => {
      const expectedTags = seedCategories[index].tags;
      expect(category.tags).toHaveLength(12);
      expect(
        category.tags.map((tag) => ({ name: tag.name, description: tag.description })),
      ).toEqual(
        expectedTags.map((tag) => ({ name: tag.name, description: tag.description })),
      );
    });

    // A couple of values typed straight from the brief, so this test would
    // also notice if seed-data.ts itself were edited by mistake.
    const energy = categories[1];
    expect(energy.tags[4].name).toBe("Giving Sea Captain Energy");
    expect(energy.tags[4].description).toBe(
      "Calm in the storm. Everyone else is panicking; they're checking the compass.",
    );

    const courses = await prisma.course.findMany({ orderBy: { order: "asc" } });
    expect(courses.map((course) => course.name)).toEqual(["Software", "Business"]);
  });

  // Spec scenario: "Seed is safe to run twice"
  it("adds nothing and changes no ids when run a second time", async () => {
    await seedCatalogue(prisma);

    // Note every id after the first run...
    const idsAfterFirstRun = await getAllIds();

    const secondRun = await seedCatalogue(prisma);

    // ...the second run reports creating nothing...
    expect(secondRun).toEqual({
      categoriesCreated: 0,
      tagsCreated: 0,
      coursesCreated: 0,
    });

    // ...and the tables hold exactly the same ids as before.
    expect(await getAllIds()).toEqual(idsAfterFirstRun);
  });

  // Spec scenario: "Re-seeding keeps database edits"
  it("keeps a tag's changed name when the seed runs again", async () => {
    await seedCatalogue(prisma);

    // Rename a tag directly in the database, like an admin will in slice 8.
    await prisma.tag.update({
      where: { id: "energy-sea-captain" },
      data: { name: "Giving Lighthouse Keeper Energy" },
    });

    await seedCatalogue(prisma);

    const tag = await prisma.tag.findUniqueOrThrow({
      where: { id: "energy-sea-captain" },
    });
    expect(tag.name).toBe("Giving Lighthouse Keeper Energy");
  });
});

// Every id in the three tables, sorted, so two snapshots can be compared.
async function getAllIds() {
  const categories = await prisma.category.findMany({ select: { id: true } });
  const tags = await prisma.tag.findMany({ select: { id: true } });
  const courses = await prisma.course.findMany({ select: { id: true } });

  return {
    categories: categories.map((row) => row.id).sort(),
    tags: tags.map((row) => row.id).sort(),
    courses: courses.map((row) => row.id).sort(),
  };
}
