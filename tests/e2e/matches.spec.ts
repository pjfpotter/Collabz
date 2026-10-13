// Browser tests for the matches page at /matches (slice 3, #10, task 6.3).
// One test per scenario in the chemistry-matching spec's "Matches page shows
// top 5 and glitch match" requirement.
//
// These need the pretend cohort and a server with it switched on, so they
// only run locally. Against a deployed site (BASE_URL set) they are skipped.

import { expect, test, type Page } from "@playwright/test";

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

const member = "pretend-user-02"; // has a finished profile
const notOnboarded = "pretend-user-31"; // has no profile yet

test.beforeAll(async () => {
  if (!prisma) return;
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  await loadPretendCohortForTests(prisma);
});

test.afterAll(async () => {
  await prisma?.$disconnect();
});

// The five matches as shown: alias and score, in the order on the page.
async function readTopFive(page: Page) {
  return page.getByTestId("top-five-list").getByTestId("match-card").evaluateAll((cards) =>
    cards.map((card) => ({
      alias: card.getAttribute("data-alias")!,
      score: Number(card.getAttribute("data-score")),
    })),
  );
}

async function readGlitchAlias(page: Page): Promise<string> {
  return (await page.getByTestId("glitch-card").getAttribute("data-alias"))!;
}

// Spec scenario: "Matches page content"
test("a member sees five matches, best first, and one surprise that is not among them", async ({
  page,
}) => {
  await page.goto("/");
  await signInAs(page, member);

  await page.goto("/matches");

  await expect(page.getByRole("heading", { level: 1, name: "Matches" })).toBeVisible();
  const topFive = await readTopFive(page);
  expect(topFive).toHaveLength(5);

  // In score order, highest first.
  const scores = topFive.map((match) => match.score);
  expect(scores).toEqual([...scores].sort((a, b) => b - a));

  // Each has a score and at least one reason.
  const cards = page.getByTestId("top-five-list").getByTestId("match-card");
  for (let index = 0; index < 5; index++) {
    await expect(cards.nth(index)).toContainText(/Chemistry score: \d+/);
    expect(await cards.nth(index).getByRole("listitem").count()).toBeGreaterThan(0);
  }

  // The surprise is marked, and is not one of the five.
  await expect(page.getByTestId("glitch-card")).toContainText("Surprise match");
  expect(topFive.map((match) => match.alias)).not.toContain(await readGlitchAlias(page));
});

// Spec scenario: "Does not change on reload" (and "Same answer every time")
test("reloading the page shows the same five and the same surprise", async ({ page }) => {
  await page.goto("/");
  await signInAs(page, member);
  await page.goto("/matches");
  const before = { topFive: await readTopFive(page), glitch: await readGlitchAlias(page) };

  await page.reload();

  expect({ topFive: await readTopFive(page), glitch: await readGlitchAlias(page) }).toEqual(before);
});

// The graph still uses slice 4's stand-in for the top 5 (until join-up). This
// checks the real rule and the stand-in agree, so the swap changes nothing.
test("the five matches are the same people the graph highlights", async ({ page }) => {
  await page.goto("/");
  await signInAs(page, member);

  await page.goto("/matches");
  const matchesHrefs = await page
    .getByTestId("top-five-list")
    .getByRole("link")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("href")!));
  const matchesGlitch = await page
    .getByTestId("glitch-match")
    .getByRole("link")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("href")!));

  await page.goto("/graph");
  const graphHrefs = await page
    .getByTestId("top-five-list")
    .getByRole("link")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("href")!));
  const graphGlitch = await page
    .getByTestId("glitch-match")
    .getByRole("link")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("href")!));

  expect(matchesHrefs).toEqual(graphHrefs);
  expect(matchesGlitch).toEqual(graphGlitch);
});

// Spec scenario: "Nobody else's real name is shown"
test("the page text contains no email address", async ({ page }) => {
  await page.goto("/");
  await signInAs(page, member);

  await page.goto("/matches");

  await expect(page.getByTestId("top-five-list")).toBeVisible();
  const main = await page.getByRole("main").textContent();
  expect(main).not.toContain("@");
  expect(await page.content()).not.toContain("@collabz.test");
});

// Spec scenario: "No profile yet"
test("someone without a finished profile is sent to onboarding", async ({ page }) => {
  await page.goto("/");
  await signInAs(page, notOnboarded);

  await page.goto("/matches");

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByTestId("top-five-list")).toHaveCount(0);
});

test("someone who is signed out is sent to sign in", async ({ page }) => {
  await page.goto("/matches");

  await expect(page).toHaveURL(/\/signin$/);
});

// Task 6.2: the page has to work on a phone. 375px is a common small phone.
test("at phone width nothing scrolls sideways and every card is readable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await signInAs(page, member);

  await page.goto("/matches");
  await expect(page.getByTestId("top-five-list")).toBeVisible();

  const fitsOnScreen = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(fitsOnScreen).toBe(true);
  // The cards themselves fit inside the screen too.
  const cardBoxes = await page.getByTestId("match-card").evaluateAll((cards) =>
    cards.map((card) => card.getBoundingClientRect().right),
  );
  for (const right of cardBoxes) {
    expect(right).toBeLessThanOrEqual(375);
  }
});
