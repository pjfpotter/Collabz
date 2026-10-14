// Browser tests for the account page (slice 7, #14, tasks 3.3 and 3.4, then
// 4.4 and 5.3). One test per scenario in the account-management spec.
//
// They act as pretend students through the dev switcher, so they only run
// locally against the test database. Against a deployed site (BASE_URL set)
// they are skipped. Photos go to the local .photo-store/ folder, never real
// storage.

import { expect, test, type Page } from "@playwright/test";

import { seedCatalogue } from "../../prisma/seed";
import { aliasToAddress } from "../../src/lib/cohort/aliasAddress";
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

// ---------------------------------------------------------------------------
// Editing answers (task 4.4). Uses a different pretend user from the tests
// above, so changing their answers can't affect those tests.
// ---------------------------------------------------------------------------

const editor = "pretend-user-03";

test("swapping a Seeking tag updates the profile and bio, and keeps the alias (spec: Edit a Seeking tag)", async ({
  page,
}) => {
  await signInAs(page, editor);
  await page.goto("/account");
  const aliasBefore = await page.getByTestId("account-alias").textContent();

  await page.getByRole("link", { name: "Edit Seeking" }).click();
  await expect(page).toHaveURL("/account/edit/seeking");

  // Unpick everything they had, then pick the first tag they didn't have.
  const picked = page.locator('button[aria-pressed="true"]');
  const wasPicked = await picked.allTextContents();
  while ((await picked.count()) > 0) {
    await picked.first().click();
  }
  const newTag = page.locator('button[aria-pressed="false"]:not([disabled])').filter({
    hasNotText: wasPicked[0],
  }).first();
  const newTagName = (await newTag.locator("span").first().textContent())!.trim();
  await newTag.click();
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // Back on the account page with the new pick, in the list and the bio.
  await expect(page).toHaveURL("/account");
  await expect(page.getByTestId("account-picks")).toContainText(newTagName);
  const lowerFirst = newTagName.charAt(0).toLowerCase() + newTagName.slice(1);
  await expect(page.getByTestId("account-bio")).toContainText(`Looking for: ${lowerFirst}`);
  await expect(page.getByTestId("account-alias")).toHaveText(aliasBefore!);
});

test("at the limit, no fifth Quality can be picked (spec: Pick limit kept)", async ({ page }) => {
  // pretend-user-02 has four Qualities, the most allowed.
  await signInAs(page, member);
  await page.goto("/account/edit/qualities");

  await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(4);
  await expect(page.getByTestId("pick-limit")).toContainText("You can pick up to 4");
  // Every tag they haven't picked is disabled.
  const unpicked = page.locator('button[aria-pressed="false"]');
  const count = await unpicked.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index++) {
    await expect(unpicked.nth(index)).toBeDisabled();
  }
});

test("with nothing picked, Save stays disabled", async ({ page }) => {
  await signInAs(page, member);
  await page.goto("/account/edit/qualities");

  const picked = page.locator('button[aria-pressed="true"]');
  while ((await picked.count()) > 0) {
    await picked.first().click();
  }

  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await expect(page.getByTestId("pick-limit")).toContainText("Pick between 1 and 4");
});

// Rule B1: every answer is picked from a list.
test("the edit screen has no text boxes, and fits a phone screen", async ({ page }) => {
  await signInAs(page, member);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/account/edit/qualities");

  await expect(page.locator('main input[type="text"], main textarea')).toHaveCount(0);
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});

test("an unknown category is 'page not found'", async ({ page }) => {
  await signInAs(page, member);
  const response = await page.goto("/account/edit/not-a-category");
  expect(response?.status()).toBe(404);
});

// ---------------------------------------------------------------------------
// Who sees the photo on the profile page (task 5.3)
// ---------------------------------------------------------------------------

const admin = "pretend-user-01";

// The profile address (/people/the-...) of a pretend user, worked out from
// their alias the same way the app does (as in profile.spec.ts).
async function profileAddressOf(userId: string): Promise<string> {
  const profile = await prisma!.profile.findUniqueOrThrow({ where: { userId } });
  return `/people/${aliasToAddress(profile.alias)}`;
}

// Someone with an approved request with `userId`, and no block: connected.
async function someoneConnectedTo(userId: string): Promise<string> {
  const approved = await prisma!.connectionRequest.findMany({
    where: { status: "APPROVED", OR: [{ fromUserId: userId }, { toUserId: userId }] },
  });
  for (const request of approved) {
    const other = request.fromUserId === userId ? request.toUserId : request.fromUserId;
    const blocks = await prisma!.block.count({
      where: {
        OR: [
          { blockerId: userId, blockedId: other },
          { blockerId: other, blockedId: userId },
        ],
      },
    });
    if (blocks === 0) return other;
  }
  throw new Error(`The pretend cohort has nobody connected to ${userId}`);
}

// A finished, unsuspended member with no request at all with `userId`.
async function aStrangerTo(userId: string): Promise<string> {
  const people = await prisma!.user.findMany({
    where: {
      id: { startsWith: "pretend-user-", notIn: [userId, admin] },
      role: "MEMBER",
      suspendedAt: null,
      profile: { completedAt: { not: null } },
      requestsSent: { none: { toUserId: userId } },
      requestsReceived: { none: { fromUserId: userId } },
    },
    orderBy: { id: "asc" },
    take: 1,
  });
  return people[0].id;
}

test.describe("the photo on the profile page", () => {
  const owner = member;

  // Give the owner a photo first (removed again at the end).
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await signInAs(page, owner);
    await page.goto("/account");
    await choosePhoto(page, { name: "me.png", mimeType: "image/png", buffer: tinyPng });
    await expect(page.getByTestId("own-photo")).toBeVisible();
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await signInAs(page, owner);
    await page.request.delete("/api/account/photo");
    await page.close();
  });

  // Spec: "Connected user sees the photo".
  test("someone connected sees it", async ({ page }) => {
    const connected = await someoneConnectedTo(owner);
    await signInAs(page, connected);
    await page.goto(await profileAddressOf(owner));

    await expect(page.getByTestId("profile-photo")).toBeVisible();
    // The browser really loaded it (an image that failed to load is 0 wide).
    await expect
      .poll(() => page.getByTestId("profile-photo").evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  });

  // Spec: "Stranger cannot see photo" and "Refused even with the direct link".
  test("a stranger sees only the silhouette, and the direct address says 'not found'", async ({ page }) => {
    const stranger = await aStrangerTo(owner);
    await signInAs(page, stranger);
    await page.goto(await profileAddressOf(owner));

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("profile-photo")).toHaveCount(0);
    expect((await page.request.get(`/api/account/photo/${owner}`)).status()).toBe(404);
  });

  // Spec: "Admin sees the photo".
  test("an admin can open it", async ({ page }) => {
    await signInAs(page, admin);
    expect((await page.request.get(`/api/account/photo/${owner}`)).status()).toBe(200);
  });

  // Spec: "Blocked after connecting".
  test("after a block, the connected person no longer sees it", async ({ page }) => {
    const connected = await someoneConnectedTo(owner);
    const block = await prisma!.block.create({ data: { blockerId: owner, blockedId: connected } });
    try {
      await signInAs(page, connected);
      expect((await page.request.get(`/api/account/photo/${owner}`)).status()).toBe(404);
    } finally {
      // Put the cohort back as it was for any later test.
      await prisma!.block.delete({
        where: { blockerId_blockedId: { blockerId: block.blockerId, blockedId: block.blockedId } },
      });
    }
  });

  // Spec: photos "SHALL never appear on the graph or in search".
  test("it never appears in the people list", async ({ page }) => {
    const connected = await someoneConnectedTo(owner);
    await signInAs(page, connected);
    await page.goto("/people");

    await expect(page.getByTestId("people-list")).toBeVisible();
    await expect(page.locator(`img[src*="/api/account/photo/"]`)).toHaveCount(0);
  });
});
