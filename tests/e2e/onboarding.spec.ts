// Browser tests for onboarding (slice 2, #9, task 5.5). A pretend student
// with no profile goes through every step by clicking only.
//
// They act as pretend students through the dev switcher, so they only run
// locally against the test database. Against a deployed site (BASE_URL set)
// they are skipped.

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

// From the pretend cohort (README, "Pretend cohort"): 31 and 32 signed up
// but haven't onboarded; 02 has a finished profile.
const newcomer = "pretend-user-31";
const finished = "pretend-user-02";

test.beforeEach(async () => {
  if (!prisma) return;
  // A fresh start for every test, so 31 has no profile each time.
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  await loadPretendCohortForTests(prisma);
});

test.afterAll(async () => {
  await prisma?.$disconnect();
});

// Clicks the tag buttons with these names, on the current step.
// A button's accessible name is the tag's name AND its description, and
// Playwright matches any part of it, ignoring case. So "Data" alone would
// also match Back-end ("...databases..."). The pattern below matches only a
// name that STARTS with the tag's name.
async function pick(page: Page, ...names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await page.getByRole("button", { name: new RegExp(`^${escaped}`) }).click();
  }
}

async function next(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

test("signed out, onboarding sends you to sign in", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL("/signin");
});

test("a newcomer builds a profile by clicking only, and sees it on the done page", async ({ page }) => {
  await signInAs(page, newcomer);
  await page.goto("/onboarding");

  // Spec scenario: "No typing anywhere"
  await expect(page.locator('main input[type="text"], main textarea')).toHaveCount(0);

  await expect(page.getByTestId("step-title")).toHaveText("Hero Story");
  await pick(page, "The Corporate Escapee");
  await next(page);

  await expect(page.getByTestId("step-title")).toHaveText("Energy");
  await pick(page, "Giving Sea Captain Energy");
  await next(page);

  await expect(page.getByTestId("step-title")).toHaveText("Vibe Diagnosis");
  await pick(page, "Rising Sign: Feral");
  await next(page);

  // Spec scenario: "Cannot go past the maximum"
  await expect(page.getByTestId("step-title")).toHaveText("Qualities");
  const qualities = page.locator("main ul button");
  for (let index = 0; index < 4; index += 1) {
    await qualities.nth(index).click();
  }
  await expect(page.getByTestId("pick-limit")).toContainText("You can pick up to 4");
  await expect(qualities.nth(4)).toBeDisabled();
  await expect(page.locator('main ul button[aria-pressed="true"]')).toHaveCount(4);
  await next(page);

  await expect(page.getByTestId("step-title")).toHaveText("Seeking");
  await page.locator("main ul button").first().click();
  await next(page);

  // Spec scenario: "Skills and interests captured"
  await expect(page.getByTestId("step-title")).toHaveText("Skills");
  await pick(page, "Back-end", "Data");
  await next(page);

  // Spec scenario: "Cannot skip a category"
  await expect(page.getByTestId("step-title")).toHaveText("Interests");
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await pick(page, "Climate");
  await next(page);

  // Spec scenario: "No silhouette chosen" (Next waits for a pick)
  await expect(page.getByTestId("step-title")).toHaveText("Pick a silhouette");
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByTestId("pick-silhouette-03").click();
  await next(page);

  await expect(page.getByTestId("onboarding-summary")).toBeVisible();
  await page.getByRole("button", { name: "Finish" }).click();

  // Spec scenarios: "Valid answers are saved", "Alias from the user's own
  // tags", "Silhouette chosen"
  await expect(page).toHaveURL("/onboarding/done");
  await expect(page.getByTestId("profile-alias")).toHaveText(/^The Feral Sea Captain( [IVX]+)?$/);
  await expect(page.locator('[data-silhouette="silhouette-03"]')).toBeVisible();
  await expect(page.getByTestId("profile-bio")).toContainText(
    "The Corporate Escapee, giving Sea Captain Energy.",
  );
  await expect(page.getByTestId("profile-skills")).toContainText("Back-end");
  await expect(page.getByTestId("profile-interests")).toContainText("Climate");

  // Spec scenario: "Finished user is not onboarded twice"
  await page.goto("/onboarding");
  await expect(page).toHaveURL("/onboarding/done");
});

test("someone with a finished profile is sent straight to the done page", async ({ page }) => {
  await signInAs(page, finished);
  await page.goto("/onboarding");
  await expect(page).toHaveURL("/onboarding/done");
  await expect(page.getByTestId("profile-card")).toBeVisible();
});

test("the done page sends someone without a profile to onboarding", async ({ page }) => {
  await signInAs(page, newcomer);
  await page.goto("/onboarding/done");
  await expect(page).toHaveURL("/onboarding");
});
