// Tests for getCatalogue() (src/lib/catalogue.ts) against the real test
// database. Covers the ordering and "retired rows are hidden" rules from the
// spec's "Public read-only catalogue page" requirement.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { getCatalogue } from "@/lib/catalogue";
import { prisma } from "@/lib/db";
import { seedCatalogue } from "../../prisma/seed";
import { seedCategories } from "../../prisma/seed-data";
import { emptyCatalogueTables } from "../helpers/database";

describe("getCatalogue", () => {
  // Start every test from a freshly seeded catalogue, so a tag retired in one
  // test is back in the next.
  beforeEach(async () => {
    await emptyCatalogueTables(prisma);
    await seedCatalogue(prisma);
  });

  // Leave the test database freshly seeded, with nothing retired.
  afterAll(async () => {
    await emptyCatalogueTables(prisma);
    await seedCatalogue(prisma);
    await prisma.$disconnect();
  });

  it("returns categories and their tags in display order", async () => {
    const catalogue = await getCatalogue();

    expect(catalogue.map((category) => category.name)).toEqual([
      "Hero Story",
      "Energy",
      "Vibe Diagnosis",
      "Qualities",
      "Seeking",
    ]);

    // Each category's tags come back in the same order as the seed data.
    catalogue.forEach((category, index) => {
      expect(category.tags.map((tag) => tag.id)).toEqual(
        seedCategories[index].tags.map((tag) => tag.id),
      );
    });
  });

  it("puts tags in `order` order, not the order rows were inserted", async () => {
    // Swap the first two Energy tags' positions directly in the database.
    // If getCatalogue() forgot to sort, it would still return the insert order.
    await prisma.tag.update({
      where: { id: "energy-mad-inventor" },
      data: { order: 2 },
    });
    await prisma.tag.update({
      where: { id: "energy-binder-for-everything" },
      data: { order: 1 },
    });

    const energy = (await getCatalogue()).find((category) => category.id === "energy");

    expect(energy?.tags.slice(0, 2).map((tag) => tag.id)).toEqual([
      "energy-binder-for-everything",
      "energy-mad-inventor",
    ]);
  });

  // Spec scenario: "Retired tags are hidden"
  it("hides a retired tag and keeps the other tags in their order", async () => {
    await prisma.tag.update({
      where: { id: "energy-sea-captain" },
      data: { retiredAt: new Date() },
    });

    const energy = (await getCatalogue()).find((category) => category.id === "energy");

    // The other 11 Energy tags, still in their original order.
    const expectedIds = seedCategories
      .find((category) => category.id === "energy")!
      .tags.map((tag) => tag.id)
      .filter((id) => id !== "energy-sea-captain");

    expect(energy?.tags.map((tag) => tag.id)).toEqual(expectedIds);
  });

  it("hides a retired category along with its tags", async () => {
    await prisma.category.update({
      where: { id: "vibe-diagnosis" },
      data: { retiredAt: new Date() },
    });

    const catalogue = await getCatalogue();

    expect(catalogue.map((category) => category.name)).toEqual([
      "Hero Story",
      "Energy",
      "Qualities",
      "Seeking",
    ]);
  });
});
