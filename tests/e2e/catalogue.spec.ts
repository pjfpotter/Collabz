// Browser tests for the /catalogue page: Playwright opens it in a real
// Chromium browser and checks what a visitor would see.
// One test per scenario in the spec's "Public read-only catalogue page"
// requirement (openspec/specs/tag-catalogue/spec.md).
//
// Locally, the page runs against the TEST database (playwright.config.ts).
// With BASE_URL set (a deployed site), only the read-only test runs.

import { expect, test, type Page } from "@playwright/test";

import { seedCatalogue } from "../../prisma/seed";
import { seedCategories } from "../../prisma/seed-data";
import { createTestDatabaseClient } from "../helpers/database";

// True when testing a deployed site, where we must not change any data.
const testingDeployedSite = Boolean(process.env.BASE_URL);

// Connect to the test database only when running locally. Against a deployed
// site we never touch a database directly.
const prisma = testingDeployedSite ? null : createTestDatabaseClient();

test.beforeAll(async () => {
  // Make sure the test database has the catalogue in it. The seed only adds
  // missing rows, so this is safe even if it's already seeded.
  if (prisma) await seedCatalogue(prisma);
});

test.afterAll(async () => {
  await prisma?.$disconnect();
});

// Spec scenario: "Visitor views the catalogue on the deployed site"
test("shows each category as a heading with its tags in order", async ({ page }) => {
  await page.goto("/catalogue");

  // The five category headings, in the brief's order.
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    seedCategories.map((category) => category.name),
  );

  // Under each heading, its 12 tag names in order, each with a description.
  for (const category of seedCategories) {
    await expect(tagNamesIn(page, category.name)).toHaveText(
      category.tags.map((tag) => tag.name),
    );
    await expect(tagDescriptionsIn(page, category.name)).toHaveText(
      category.tags.map((tag) => tag.description),
    );
  }
});

// Spec scenario: "Catalogue reflects the database"
test("shows a tag's new name after it's renamed in the database", async ({ page }) => {
  test.skip(testingDeployedSite, "Changes data, so only runs against the test database");

  const tagId = "energy-sea-captain";
  const originalName = "Giving Sea Captain Energy";
  const newName = "Giving Lighthouse Keeper Energy";

  await page.goto("/catalogue");
  await expect(tagNamesIn(page, "Energy")).toContainText([originalName]);

  try {
    await prisma!.tag.update({ where: { id: tagId }, data: { name: newName } });
    await page.reload();

    await expect(tagNamesIn(page, "Energy")).toContainText([newName]);
    await expect(page.getByText(originalName)).toHaveCount(0);
  } finally {
    // Put the name back even if a check above failed, so the next test (and
    // the next person using the dev database) sees the normal catalogue.
    await prisma!.tag.update({ where: { id: tagId }, data: { name: originalName } });
  }
});

// Spec scenario: "Retired tags are hidden"
test("hides a retired tag and keeps the others in order", async ({ page }) => {
  test.skip(testingDeployedSite, "Changes data, so only runs against the test database");

  const tagId = "energy-sea-captain";
  const energyTags = seedCategories.find((category) => category.id === "energy")!.tags;
  const otherEnergyTagNames = energyTags
    .filter((tag) => tag.id !== tagId)
    .map((tag) => tag.name);

  try {
    await prisma!.tag.update({ where: { id: tagId }, data: { retiredAt: new Date() } });
    await page.goto("/catalogue");

    // The other 11 Energy tags, in their original order, and nothing else.
    await expect(tagNamesIn(page, "Energy")).toHaveText(otherEnergyTagNames);
  } finally {
    // Un-retire it, even if a check above failed.
    await prisma!.tag.update({ where: { id: tagId }, data: { retiredAt: null } });
  }
});

// --- Helpers for finding things on the page ---------------------------------

// The <section> for one category: the one containing that category's heading.
function categorySection(page: Page, categoryName: string) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: categoryName, exact: true }),
  });
}

// In the page, each tag is a list item with two paragraphs:
// first the tag's name, then its description.
function tagNamesIn(page: Page, categoryName: string) {
  return categorySection(page, categoryName).locator("li > p:first-child");
}

function tagDescriptionsIn(page: Page, categoryName: string) {
  return categorySection(page, categoryName).locator("li > p:last-child");
}
