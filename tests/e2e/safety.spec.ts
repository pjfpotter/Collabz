// Browser tests for safety (slice 9, #16, task 5.1).
//
// This file starts with the moderation queue (group 3). The member's Block
// and Report buttons are added to it in group 4.
//
// Success checks from #16 covered here:
//   - non-admins can't see the queue,
//   - admins see open reports and can resolve one.
//
// Like admin.spec.ts it needs the pretend cohort, so it only runs locally.

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

const admin = "pretend-user-01";
const member = "pretend-user-02";

test.beforeAll(async () => {
  if (!prisma) return;
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  await loadPretendCohortForTests(prisma);
});

test.afterAll(async () => {
  // The whole database is put back after the run (playwrightGlobalTeardown).
  await prisma?.$disconnect();
});

test.describe("who can open the moderation queue", () => {
  test("a signed-out visitor is sent to sign in", async ({ page }) => {
    await page.goto("/");
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("a member sees 'page not found'", async ({ page }) => {
    await page.goto("/");
    await signInAs(page, member);

    const response = await page.goto("/admin/reports");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toHaveCount(0);
  });
});

test.describe("the queue, as an admin", () => {
  test("shows the pretend cohort's open report with its three actions, and Resolve moves it", async ({
    page,
  }) => {
    await page.goto("/");
    await signInAs(page, admin);
    await page.goto("/admin/reports");

    await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
    const openCards = page.getByTestId("open-reports").getByTestId("report-card");
    await expect(openCards).toHaveCount(1);
    await expect(openCards.first()).toContainText("Inappropriate messages");
    await expect(openCards.first().getByRole("button", { name: "Resolve" })).toBeVisible();
    await expect(openCards.first().getByRole("button", { name: "Suspend" })).toBeVisible();

    await openCards.first().getByRole("button", { name: "Resolve" }).click();

    await expect(page.getByTestId("no-open-reports")).toBeVisible();
    await expect(
      page.getByTestId("resolved-reports").getByTestId("report-card"),
    ).toHaveCount(1);
  });
});
