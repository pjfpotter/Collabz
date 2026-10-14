// The seed's slice 2 additions (#9, task 2.4), against the test database:
// pick limits, and alias words that are filled in but never overwritten.
// One test per new scenario in the tag-catalogue spec delta.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";

beforeEach(async () => {
  await emptyDatabase(prisma);
});

afterAll(async () => {
  // No restoring here: tests/helpers/restoreDevData.ts puts the database
  // back once, after the whole test run.
  await prisma.$disconnect();
});

describe("seedCatalogue: slice 2 additions", () => {
  // Spec scenario: "Pick limits are seeded"
  it("seeds pick-exactly-1 and pick-1-to-4 categories, 12 tags each", async () => {
    await seedCatalogue(prisma);

    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { tags: true } } },
    });

    expect(
      categories.map((category) => [category.id, category.pickMin, category.pickMax]),
    ).toEqual([
      ["hero-story", 1, 1],
      ["energy", 1, 1],
      ["vibe-diagnosis", 1, 1],
      ["qualities", 1, 4],
      ["seeking", 1, 4],
      ["skills", 1, 4],
      ["interests", 1, 4],
    ]);
    for (const category of categories) {
      expect(category._count.tags).toBe(12);
    }
  });

  it("gives all 24 Energy and Vibe tags an alias word, and no other tag one", async () => {
    const result = await seedCatalogue(prisma);

    expect(result.aliasWordsFilled).toBe(24);
    const withWord = await prisma.tag.findMany({ where: { aliasWord: { not: null } } });
    expect(withWord).toHaveLength(24);
    for (const tag of withWord) {
      expect(["energy", "vibe-diagnosis"]).toContain(tag.categoryId);
    }

    const seaCaptain = await prisma.tag.findUniqueOrThrow({ where: { id: "energy-sea-captain" } });
    expect(seaCaptain.aliasWord).toBe("Sea Captain");
  });

  // Spec scenario: "Alias words are filled in but never overwritten"
  it("fills empty alias words on a re-seed, and keeps one an admin changed", async () => {
    await seedCatalogue(prisma);

    // Like a database seeded before slice 2: every word empty...
    await prisma.tag.updateMany({ data: { aliasWord: null } });
    // ...except one an admin has since changed.
    await prisma.tag.update({
      where: { id: "vibe-diagnosis-rising-feral" },
      data: { aliasWord: "Wild" },
    });

    const secondRun = await seedCatalogue(prisma);

    expect(secondRun.aliasWordsFilled).toBe(23);
    const feral = await prisma.tag.findUniqueOrThrow({ where: { id: "vibe-diagnosis-rising-feral" } });
    expect(feral.aliasWord).toBe("Wild");
    expect(await prisma.tag.count({ where: { aliasWord: { not: null } } })).toBe(24);

    // And a third run has nothing left to fill.
    expect((await seedCatalogue(prisma)).aliasWordsFilled).toBe(0);
  });
});
