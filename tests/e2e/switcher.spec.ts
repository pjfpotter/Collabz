// Browser tests for the dev "sign in as…" switcher and the admin check
// (foundation #7, task 5.5). One test per scenario in the pretend-cohort spec
// (requirement "Sign in as any pretend user") and the admin spec
// (requirement "Admin role").
//
// These need the pretend cohort and a server with it switched on, so they
// only run locally. Against a deployed site (BASE_URL set) they are skipped.
// That the switcher is ABSENT on the live site is checked by hand after
// deploying (task 6.3) and by tests/unit/pretendCohort.test.ts.

import { expect, test } from "@playwright/test";

import { seedCatalogue } from "../../prisma/seed";
import {
  createTestDatabaseClient,
  emptyDatabase,
  loadPretendCohortForTests,
} from "../helpers/database";
import { signInAs, signOut } from "../helpers/devSignIn";

const testingDeployedSite = Boolean(process.env.BASE_URL);
test.skip(testingDeployedSite, "Needs the pretend cohort, so only runs against the test database");

const prisma = testingDeployedSite ? null : createTestDatabaseClient();

// People from the pretend cohort (see the README's "Pretend cohort" table).
const admin = "pretend-user-01";
const member = "pretend-user-02";

const switcher = "#dev-user-switcher";

test.beforeAll(async () => {
  if (!prisma) return;
  // Start from a known state: the catalogue plus a fresh pretend cohort.
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  await loadPretendCohortForTests(prisma);
});

test.afterAll(async () => {
  await prisma?.$disconnect();
});

test("starts signed out, offering every pretend user", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(switcher)).toHaveValue("");
  // 32 pretend users plus "Signed out".
  await expect(page.locator(`${switcher} option`)).toHaveCount(33);
});

test("labels the admin, the suspended user and the ones who haven't onboarded", async ({ page }) => {
  await page.goto("/");

  const labels = await page.locator(`${switcher} option`).allTextContents();

  expect(labels[0]).toBe("Signed out");
  expect(labels[1]).toMatch(/^01 · The Pretend .+ 01 · Software · admin$/);
  expect(labels[2]).toMatch(/^02 · The Pretend .+ 02 · Business$/);
  expect(labels[30]).toMatch(/^30 · The Pretend .+ 30 · Business · suspended$/);
  expect(labels[31]).toBe("31 · (no profile yet) · Software");
});

// Spec scenario: "Become a pretend user"
test("picking a pretend user signs you in and returns you to the same page", async ({ page }) => {
  await page.goto("/requests");

  await signInAs(page, member);

  await expect(page).toHaveURL(/\/requests$/);
  await expect(page.locator(switcher)).toHaveValue(member);
});

// Spec scenario: "Still signed in on the next page"
test("you stay signed in when you go to another page", async ({ page }) => {
  await page.goto("/");
  await signInAs(page, member);

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Graph" }).click();

  await expect(page).toHaveURL(/\/graph$/);
  await expect(page.locator(switcher)).toHaveValue(member);
});

// Spec scenario: "Sign out"
test('choosing "Signed out" signs you out', async ({ page }) => {
  await page.goto("/");
  await signInAs(page, member);

  await signOut(page);

  await expect(page.locator(switcher)).toHaveValue("");
  // Proof that the app really treats us as signed out, not just the list:
  // an admin page now asks us to sign in.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/signin$/);
});

// Spec scenario: "Only pretend users are offered"
test("a real user is never offered in the switcher", async ({ page }) => {
  // The kind of row slice 1's sign-up will create: an id without the
  // pretend prefix.
  await prisma!.user.create({
    data: { id: "real-user-for-switcher-test", email: "real.student@example.test" },
  });

  try {
    await page.goto("/");

    await expect(page.locator(`${switcher} option`)).toHaveCount(33);
    await expect(
      page.locator(`${switcher} option[value="real-user-for-switcher-test"]`),
    ).toHaveCount(0);
  } finally {
    await prisma!.user.delete({ where: { id: "real-user-for-switcher-test" } });
  }
});

test.describe("admin pages", () => {
  // Admin spec scenario: "Visitor who is not signed in"
  for (const path of ["/admin", "/admin/reports"]) {
    test(`${path} sends a signed-out visitor to sign in`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/signin$/);
    });
  }

  // Admin spec scenario: "Member blocked from admin"
  for (const path of ["/admin", "/admin/reports"]) {
    test(`${path} shows a member "page not found" and nothing from the admin screen`, async ({ page }) => {
      await page.goto("/");
      await signInAs(page, member);

      const response = await page.goto(path);

      // 404 is the web's code for "not found".
      expect(response?.status()).toBe(404);
      await expect(page.getByText("This page could not be found.")).toBeVisible();
      await expect(page.getByText("This page is a placeholder.")).toHaveCount(0);
    });
  }

  // Admin spec scenario: "Admin allowed"
  test("an admin sees both admin pages", async ({ page }) => {
    await page.goto("/");
    await signInAs(page, admin);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Admin" })).toBeVisible();
    await expect(page.getByText("Slice 8 (issue #15) will build it.")).toBeVisible();

    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
    await expect(page.getByText("Slice 9 (issue #16) will build it.")).toBeVisible();
  });
});
