// Tests for prisma/seed.ts against the real test database.
// One test per scenario in the spec's "Categories, tags and courses are
// stored as data" requirement (openspec/specs/tag-catalogue/spec.md).

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { seedCatalogue } from "../../prisma/seed";
import { seedCategories, seedPairings } from "../../prisma/seed-data";
import { emptyDatabase } from "../helpers/database";

describe("seedCatalogue", () => {
  // Every test starts from empty tables, so tests can't affect each other.
  beforeEach(async () => {
    await emptyDatabase(prisma);
  });

  // Leave the test database the way the app expects it: freshly seeded, with
  // no renamed tags left behind by the tests below.
  afterAll(async () => {
    // No restoring here: tests/helpers/restoreDevData.ts puts the database
    // back once, after the whole test run.
    await prisma.$disconnect();
  });

  // Spec scenario: "Fresh database is seeded"
  it("fills an empty database with 7 categories of 12 tags, in order, plus 2 courses", async () => {
    await seedCatalogue(prisma);

    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { tags: { orderBy: { order: "asc" } } },
    });

    // The five categories from the brief, in the brief's order, then the two
    // onboarding added (slice 2, #9).
    expect(categories.map((category) => category.name)).toEqual([
      "Hero Story",
      "Energy",
      "Vibe Diagnosis",
      "Qualities",
      "Seeking",
      "Skills",
      "Interests",
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
      pairingsCreated: 0,
      aliasWordsFilled: 0,
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

// The Seeking <-> Quality pairings (slice 3, #10, spec requirement "Seeking
// and Quality pairings are stored as data").
describe("seedCatalogue: Seeking and Quality pairings", () => {
  beforeEach(async () => {
    await emptyDatabase(prisma);
  });

  // Spec scenario: "Pairings are seeded"
  it("gives every Seeking tag at least one Quality, and every pairing points at real tags", async () => {
    await seedCatalogue(prisma);

    const seekingTags = await prisma.tag.findMany({ where: { categoryId: "seeking" } });
    const pairings = await prisma.tagPairing.findMany({
      include: { seekingTag: true, qualityTag: true },
    });

    // 12 Seeking tags, and each has a pairing.
    expect(seekingTags).toHaveLength(12);
    const pairedSeekingIds = new Set(pairings.map((pairing) => pairing.seekingTagId));
    for (const tag of seekingTags) {
      expect(pairedSeekingIds.has(tag.id), `${tag.id} has no pairing`).toBe(true);
    }

    // The database already refuses a pairing whose tags don't exist (a
    // foreign key), and the include above would be null otherwise. What it
    // can't check is the CATEGORY: a Seeking tag must really be a Seeking
    // tag and a Quality tag a Quality tag, not the two swapped.
    for (const pairing of pairings) {
      expect(pairing.seekingTag.categoryId).toBe("seeking");
      expect(pairing.qualityTag.categoryId).toBe("qualities");
    }

    // Every Quality satisfies at least one Seeking tag, so no Quality tag is
    // worth nothing in the score.
    const qualityTags = await prisma.tag.findMany({ where: { categoryId: "qualities" } });
    const pairedQualityIds = new Set(pairings.map((pairing) => pairing.qualityTagId));
    for (const tag of qualityTags) {
      expect(pairedQualityIds.has(tag.id), `${tag.id} satisfies nothing`).toBe(true);
    }
  });

  it("stores exactly the pairs written in seed-data.ts, once each", async () => {
    await seedCatalogue(prisma);

    const expected = seedPairings.flatMap((pairing) =>
      pairing.qualityTagIds.map((qualityTagId) => `${pairing.seekingTagId} <- ${qualityTagId}`),
    );
    const stored = (await prisma.tagPairing.findMany()).map(
      (pairing) => `${pairing.seekingTagId} <- ${pairing.qualityTagId}`,
    );

    expect(stored.sort()).toEqual(expected.sort());
    // 23 is the agreed list (11 Seeking tags with two Qualities, one with
    // one). Written out so a pair added or dropped by mistake is noticed.
    expect(stored).toHaveLength(23);
  });

  // Spec scenario: "Re-seeding keeps database edits"
  it("adds back a pairing that was removed, without duplicating the others", async () => {
    await seedCatalogue(prisma);
    const before = await prisma.tagPairing.count();

    // Remove one pairing in the database, like an admin editing the list.
    await prisma.tagPairing.delete({
      where: {
        seekingTagId_qualityTagId: {
          seekingTagId: "seeking-stays-when-hard",
          qualityTagId: "qualities-stays-calm",
        },
      },
    });

    const secondRun = await seedCatalogue(prisma);

    // Only the missing pair was added, and the table is whole again.
    expect(secondRun.pairingsCreated).toBe(1);
    expect(await prisma.tagPairing.count()).toBe(before);
  });

  it("leaves a pairing an admin added alone", async () => {
    await seedCatalogue(prisma);

    // A pair that is NOT in the seed list.
    await prisma.tagPairing.create({
      data: {
        seekingTagId: "seeking-makes-it-look-good",
        qualityTagId: "qualities-goes-deep",
      },
    });

    await seedCatalogue(prisma);

    const added = await prisma.tagPairing.findUnique({
      where: {
        seekingTagId_qualityTagId: {
          seekingTagId: "seeking-makes-it-look-good",
          qualityTagId: "qualities-goes-deep",
        },
      },
    });
    expect(added).not.toBeNull();
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
