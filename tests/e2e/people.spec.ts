// Browser tests for the people list and its filters at /people (slice 4,
// #11, task 5.4). One test per scenario in the people-search spec.
//
// These need the pretend cohort and a server with it switched on, so they
// only run locally. Against a deployed site (BASE_URL set) they are skipped.

import { expect, test } from "@playwright/test";

import { seedCatalogue } from "../../prisma/seed";
import {
  createTestDatabaseClient,
  emptyDatabase,
  loadPretendCohortForTests,
} from "../helpers/database";
import { signInAs } from "../helpers/devSignIn";

const testingDeployedSite = Boolean(process.env.BASE_URL);
test.skip(testingDeployedSite, "Needs the pretend cohort, so only runs against the test database");

const prisma = testingDeployedSite ? null : createTestDatabaseClient();

// The person these tests sign in as (see the README's "Pretend cohort" table).
const member = "pretend-user-02";

// The Skills and Interests tags arrive with slice 2 (#9), so these tests add
// two small categories of their own and give them to a few pretend users.
// Who gets what is chosen so every expected answer below can be read off
// this table:
//
//   user | course   | skill  | interest
//   -----|----------|--------|---------
//   03   | Software | Data   | Climate
//   04   | Business | Data   | Climate
//   05   | Software | Data   | Music
//   06   | Business | Design | Climate
//
// (The courses come from the cohort itself: odd numbers are Software and
// even numbers are Business. A test below checks that, so if the cohort ever
// changes, that test fails first and says why.)
const testPicks = [
  { userId: "pretend-user-03", tagIds: ["skills-data", "interests-climate"] },
  { userId: "pretend-user-04", tagIds: ["skills-data", "interests-climate"] },
  { userId: "pretend-user-05", tagIds: ["skills-data", "interests-music"] },
  { userId: "pretend-user-06", tagIds: ["skills-design", "interests-climate"] },
];

test.beforeAll(async () => {
  if (!prisma) return;
  // Start from a known state: the catalogue plus a fresh pretend cohort.
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  await loadPretendCohortForTests(prisma);

  await prisma.category.createMany({
    data: [
      { id: "skills", name: "Skills", pickMin: 1, pickMax: 4, order: 6 },
      { id: "interests", name: "Interests", pickMin: 1, pickMax: 4, order: 7 },
    ],
  });
  await prisma.tag.createMany({
    data: [
      { id: "skills-data", name: "Data", description: "", order: 1, categoryId: "skills" },
      { id: "skills-design", name: "Design", description: "", order: 2, categoryId: "skills" },
      { id: "interests-climate", name: "Climate", description: "", order: 1, categoryId: "interests" },
      { id: "interests-music", name: "Music", description: "", order: 2, categoryId: "interests" },
    ],
  });
  await prisma.profileTag.createMany({
    data: testPicks.flatMap((pick) =>
      pick.tagIds.map((tagId) => ({ userId: pick.userId, tagId })),
    ),
  });
});

test.afterAll(async () => {
  // The test categories are removed by the next emptyDatabase(), and the
  // whole dev database is put back after the run (playwrightGlobalTeardown).
  await prisma?.$disconnect();
});

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await signInAs(page, member);
});

// The rows of the list, and the alias written in each one.
const rows = (page: import("@playwright/test").Page) =>
  page.getByTestId("people-list").getByRole("listitem");
const aliasesShown = (page: import("@playwright/test").Page) =>
  rows(page).getByRole("link").allTextContents();

// Picks a value in one of the filter dropdowns and presses Apply.
async function applyFilters(
  page: import("@playwright/test").Page,
  choices: { course?: string; skill?: string; interest?: string },
) {
  if (choices.course) await page.getByLabel("Course").selectOption({ label: choices.course });
  if (choices.skill) await page.getByLabel("Skill").selectOption({ label: choices.skill });
  if (choices.interest) await page.getByLabel("Interest").selectOption({ label: choices.interest });
  await page.getByRole("button", { name: "Apply" }).click();
}

// Spec scenario: "Browse everyone"
test("with no filter, lists every visible person except you", async ({ page }) => {
  await page.goto("/people");

  // 30 finished profiles, minus the suspended one, minus yourself.
  await expect(rows(page)).toHaveCount(28);
  await expect(page.getByTestId("people-count")).toContainText("28 people.");

  const aliases = await aliasesShown(page);
  // You are user 02; the suspended user is 30. Neither is listed.
  expect(aliases.some((alias) => alias.endsWith(" 02"))).toBe(false);
  expect(aliases.some((alias) => alias.endsWith(" 30"))).toBe(false);
});

test("shows each person's course and score, and badges your matches", async ({ page }) => {
  await page.goto("/people");

  // Best match first, so the first row is one of your top 5.
  await expect(rows(page).first()).toContainText("Top 5");
  await expect(rows(page).first()).toContainText(/Score with you: \d+/);
  await expect(rows(page).first()).toContainText(/Software|Business/);

  // Exactly five "Top 5" badges and one "Glitch match" badge in the list.
  await expect(page.getByTestId("people-list").getByText("Top 5", { exact: true })).toHaveCount(5);
  await expect(
    page.getByTestId("people-list").getByText("Glitch match", { exact: true }),
  ).toHaveCount(1);
});

test("shows a person's skills and interests in their row", async ({ page }) => {
  await page.goto("/people");

  // The row whose profile link (the alias) ends in "03".
  const rowForUserThree = rows(page).filter({
    has: page.getByRole("link", { name: / 03$/ }),
  });
  await expect(rowForUserThree).toContainText("Skills: Data");
  await expect(rowForUserThree).toContainText("Interests: Climate");
});

// Spec scenario: "Filter by course"
test("filtering by course lists only that course and puts it in the address", async ({ page }) => {
  await page.goto("/people");

  await applyFilters(page, { course: "Business" });

  await expect(page).toHaveURL(/[?&]course=business/);
  const rowTexts = await rows(page).allTextContents();
  expect(rowTexts.length).toBeGreaterThan(0);
  expect(rowTexts.length).toBeLessThan(28);
  for (const text of rowTexts) {
    expect(text).toContain("Business");
    expect(text).not.toContain("Software");
  }
  // The dropdown still shows what was chosen after the page reloads.
  await expect(page.getByLabel("Course")).toHaveValue("business");
});

test("the filter survives a refresh, because it lives in the address", async ({ page }) => {
  await page.goto("/people?course=business");
  const before = await aliasesShown(page);

  await page.reload();

  expect(await aliasesShown(page)).toEqual(before);
});

// Spec scenario: "Filter by skill" and "Filter by interest"
test("filtering by skill narrows the list to people with that skill", async ({ page }) => {
  await page.goto("/people");

  await applyFilters(page, { skill: "Data" });

  // Users 03, 04 and 05 have Data (see the table at the top).
  const aliases = await aliasesShown(page);
  expect(aliases.map((alias) => alias.slice(-2)).sort()).toEqual(["03", "04", "05"]);
});

test("filtering by interest narrows the list to people with that interest", async ({ page }) => {
  await page.goto("/people");

  await applyFilters(page, { interest: "Climate" });

  // Users 03, 04 and 06 have Climate.
  const aliases = await aliasesShown(page);
  expect(aliases.map((alias) => alias.slice(-2)).sort()).toEqual(["03", "04", "06"]);
});

// Spec scenario: "Combine filters"
test("filters combine: a person must fit every one that is chosen", async ({ page }) => {
  await page.goto("/people");

  // First check the table's assumption about courses still holds.
  await applyFilters(page, { skill: "Data", interest: "Climate" });
  const both = await rows(page).allTextContents();
  expect(both.find((text) => text.includes(" 03"))).toContain("Software");
  expect(both.find((text) => text.includes(" 04"))).toContain("Business");

  // Skill + interest + course: only user 04 is Business with Data and Climate.
  await applyFilters(page, { course: "Business", skill: "Data", interest: "Climate" });

  const aliases = await aliasesShown(page);
  expect(aliases.map((alias) => alias.slice(-2))).toEqual(["04"]);
  await expect(page.getByTestId("people-count")).toContainText("1 person matches these filters.");
});

// Spec scenario: "Nobody matches"
test("a filter nobody matches says so, and Clear brings everyone back", async ({ page }) => {
  // Design + Music: nobody in the table has both.
  await page.goto("/people?skill=skills-design&interest=interests-music");

  await expect(page.getByTestId("nobody-matches")).toContainText(
    "Nobody matches all of these filters.",
  );
  await expect(page.getByTestId("people-list")).toHaveCount(0);

  await page.getByRole("link", { name: "Clear", exact: true }).click();

  await expect(page).toHaveURL(/\/people$/);
  await expect(rows(page)).toHaveCount(28);
});

test("an unknown value in the address is ignored, not an error", async ({ page }) => {
  const response = await page.goto("/people?course=astronomy&skill=nonsense");

  expect(response?.status()).toBe(200);
  await expect(rows(page)).toHaveCount(28);
});

// Spec scenario: "Show on the graph"
test('"Show on the graph" carries the filters to the graph, and back again', async ({ page }) => {
  await page.goto("/people?course=business&skill=skills-data");
  const listed = await rows(page).count();

  await page.getByRole("link", { name: "Show on the graph" }).click();

  await expect(page).toHaveURL(/\/graph\?course=business&skill=skills-data$/);
  await expect(page.getByTestId("graph-filters")).toContainText("Course: Business");
  await expect(page.getByTestId("graph-filters")).toContainText("Skill: Data");
  // The graph still draws everyone (29 dots), and reports the same number of
  // people fitting the filters as the list showed.
  const graphBox = page.getByTestId("cohort-graph");
  await expect(graphBox).toHaveAttribute("data-node-count", "29");
  await expect(graphBox).toHaveAttribute("data-matching-count", String(listed));

  await page.getByRole("link", { name: "Back to the list" }).click();

  await expect(page).toHaveURL(/\/people\?course=business&skill=skills-data$/);
  await expect(rows(page)).toHaveCount(listed);
});

test("at phone width the list and the filters fit, with nothing scrolling sideways", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("/people");

  const widths = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    screen: document.documentElement.clientWidth,
  }));
  expect(widths.page).toBeLessThanOrEqual(widths.screen);
});

test("sends no email address to the browser", async ({ page }) => {
  await page.goto("/people");

  expect(await page.content()).not.toContain("@collabz.test");
});

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  // beforeEach signed us in, so sign out first by choosing "Signed out".
  await signInAs(page, "");

  await page.goto("/people");

  await expect(page).toHaveURL(/\/signin$/);
});
