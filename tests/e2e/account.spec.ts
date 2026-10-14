// Browser tests for the account page (slice 7, #14, tasks 3.3 and 3.4, then
// 4.4 and 5.3). One test per scenario in the account-management spec.
//
// They act as pretend students through the dev switcher, so they only run
// locally against the test database. Against a deployed site (BASE_URL set)
// they are skipped. Photos go to the local .photo-store/ folder, never real
// storage.

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

// From the pretend cohort (README, "Pretend cohort"): 02 has a finished
// profile and is on Business; 31 signed up but hasn't onboarded.
const member = "pretend-user-02";
const noProfile = "pretend-user-31";

// A real 1x1 pixel PNG, so the browser can actually draw it.
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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

// Picks a file in the photo form's (hidden) file input.
async function choosePhoto(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.locator('input[type="file"]').setInputFiles(file);
}

test("signed out, the account page sends you to sign in (spec: Not signed in)", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL("/signin");
});

test("someone without a profile can manage their course but is pointed to onboarding (spec: No profile yet)", async ({
  page,
}) => {
  await signInAs(page, noProfile);
  await page.goto("/account");

  await expect(page.getByTestId("no-profile")).toBeVisible();
  await expect(page.getByRole("link", { name: "Set up your profile" })).toHaveAttribute("href", "/onboarding");
  await expect(page.getByRole("combobox", { name: "Your course" })).toBeVisible();
  // No photo to add without a profile.
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test("changing course saves it (spec: Change course)", async ({ page }) => {
  await signInAs(page, member);
  await page.goto("/account");
  await expect(page.getByRole("combobox", { name: "Your course" })).toHaveValue("business");

  await page.getByRole("combobox", { name: "Your course" }).selectOption("software");
  await page.getByRole("button", { name: "Save course" }).click();
  await expect(page.getByTestId("course-saved")).toBeVisible();

  // Still there after a fresh load, and in the database.
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Your course" })).toHaveValue("software");
  const saved = await prisma!.user.findUniqueOrThrow({ where: { id: member } });
  expect(saved.courseId).toBe("software");

  // Put it back, so later tests see the cohort as loaded.
  await prisma!.user.update({ where: { id: member }, data: { courseId: "business" } });
});

test("adding, viewing and removing a photo (spec: Remove a photo)", async ({ page }) => {
  await signInAs(page, member);
  await page.goto("/account");
  const photoAddress = `/api/account/photo/${member}`;

  await choosePhoto(page, { name: "me.png", mimeType: "image/png", buffer: tinyPng });
  await expect(page.getByTestId("own-photo")).toBeVisible();

  // The owner can open it directly (page.request shares the page's cookies).
  const ownView = await page.request.get(photoAddress);
  expect(ownView.status()).toBe(200);
  expect(ownView.headers()["content-type"]).toBe("image/png");
  expect(ownView.headers()["cache-control"]).toBe("private, no-store");

  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByTestId("own-photo")).toHaveCount(0);

  // Gone for everyone, the owner included.
  expect((await page.request.get(photoAddress)).status()).toBe(404);
  const profile = await prisma!.profile.findUniqueOrThrow({ where: { userId: member } });
  expect(profile.photoKey).toBeNull();
});

test("a photo over 4 MB is refused with the limit (spec: File too big or wrong type)", async ({ page }) => {
  await signInAs(page, member);
  await page.goto("/account");

  await choosePhoto(page, {
    name: "huge.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(5 * 1024 * 1024),
  });

  await expect(page.getByTestId("photo-problem")).toContainText("4 MB");
  await expect(page.getByTestId("own-photo")).toHaveCount(0);
});

test("a file that only pretends to be a photo is refused by the server", async ({ page }) => {
  await signInAs(page, member);
  await page.goto("/account");

  // The browser is told it's a JPEG, so the quick check in the browser lets
  // it through; the server reads the bytes and refuses it.
  await choosePhoto(page, {
    name: "not-really.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("%PDF-1.4 this is a document"),
  });

  await expect(page.getByTestId("photo-problem")).toContainText("isn't a JPEG, PNG or WebP");
  await expect(page.getByTestId("own-photo")).toHaveCount(0);
});

test("the account page fits a phone screen", async ({ page }) => {
  await signInAs(page, member);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/account");

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});
