// Browser tests for the admin screens (slice 8, #15, task 6.1).
//
// These are the success checks from issue #15, run in a real browser:
//   - a member or a signed-out visitor can't open any /admin page,
//   - renaming a tag shows straight away on /catalogue,
//   - a retired tag is no longer listed, but a profile that picked it still
//     shows it,
//   - a suspended person vanishes from the people list (and can come back).
//
// "Can't reach an admin ACTION by calling the server directly" is covered by
// tests/integration/adminActions.test.ts, which a browser can't do as well.
//
// These need the pretend cohort and a server with it switched on, so they only
// run locally. Against a deployed site (BASE_URL set) they are skipped.

import { expect, test, type Page } from "@playwright/test";

import { seedCatalogue } from "../../prisma/seed";
import { seedCategories } from "../../prisma/seed-data";
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

// People from the pretend cohort (see the README's "Pretend cohort" table).
const admin = "pretend-user-01";
const member = "pretend-user-02";
const personToSuspend = "pretend-user-05";
const personWithPhoto = "pretend-user-07";

const adminPages = ["/admin", "/admin/categories", "/admin/courses", "/admin/users"];

test.beforeAll(async () => {
  if (!prisma) return;
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  await loadPretendCohortForTests(prisma);
});

// The catalogue tests that run after this file (catalogue.spec.ts) only add
// missing rows and expect the seeded catalogue as it was shipped. So this
// file puts back the two tags it changes, instead of leaving them renamed and
// retired for the next spec to trip over.
const tagsToRestore = new Set<string>(["energy-sea-captain"]);

test.afterAll(async () => {
  if (prisma) {
    for (const category of seedCategories) {
      for (const tag of category.tags) {
        if (tagsToRestore.has(tag.id)) {
          await prisma.tag.update({
            where: { id: tag.id },
            data: { name: tag.name, retiredAt: null },
          });
        }
      }
    }
  }
  // The whole database is put back after the run (playwrightGlobalTeardown).
  await prisma?.$disconnect();
});

// Presses a button on the card (the <li>) that contains the given field, and
// waits for the Server Action behind it to finish.
//
// Why the card and not the form: a tag's Rename, Retire and Move buttons are
// separate forms, so "the form with the name field" has only the Rename
// button. Why wait for the POST: pressing the button sends the change in the
// background, and a test that moves on at once can read the page before the
// change was saved.
async function pressOnCardWith(page: Page, fieldSelector: string, buttonName: string) {
  const button = page
    .locator("li", { has: page.locator(fieldSelector) })
    .getByRole("button", { name: buttonName, exact: true });

  // A Server Action's request carries a "next-action" header; matching on it
  // means we wait for OUR action and not some other background POST.
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.request().headers()["next-action"] !== undefined,
    ),
    button.click(),
  ]);
}

test.describe("who can open the admin area", () => {
  test("a signed-out visitor is sent to sign in from every admin page", async ({ page }) => {
    await page.goto("/");
    for (const path of adminPages) {
      await page.goto(path);
      await expect(page, `${path} should send a visitor to sign in`).toHaveURL(/\/signin/);
    }
  });

  test("a member sees 'page not found' on every admin page", async ({ page }) => {
    await page.goto("/");
    await signInAs(page, member);

    for (const path of adminPages) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should be not found for a member`).toBe(404);
      // And nothing from the admin screen leaks into the page.
      await expect(page.getByRole("heading", { name: "Categories & tags" })).toHaveCount(0);
    }
  });

  test("an admin sees the admin area and its menu", async ({ page }) => {
    await page.goto("/");
    await signInAs(page, admin);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Admin" })).toBeVisible();

    const menu = page.getByRole("navigation", { name: "Admin sections" });
    await expect(menu.getByRole("link", { name: "Categories & tags" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Courses" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Reports" })).toBeVisible();
  });
});

test.describe("as an admin", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await signInAs(page, admin);
  });

  // Success check: "Renaming a tag shows straight away in onboarding and on
  // /catalogue, and its id doesn't change". Onboarding isn't built yet, so
  // /catalogue stands in; both read the same rows.
  test("renaming a tag shows straight away on the catalogue", async ({ page }) => {
    await page.goto("/admin/categories");
    await page.locator("#name-energy-sea-captain").fill("Giving Ship's Captain Energy");
    await pressOnCardWith(page, "#name-energy-sea-captain", "Rename");

    // Back on the admin page, with the id unchanged.
    await expect(page.locator("#name-energy-sea-captain")).toHaveValue(
      "Giving Ship's Captain Energy",
    );

    await page.goto("/catalogue");
    await expect(page.getByText("Giving Ship's Captain Energy")).toBeVisible();
    await expect(page.getByText("Giving Sea Captain Energy")).toHaveCount(0);
  });

  // Success check: "A retired tag can't be picked any more, but existing
  // profiles and scores still work".
  test("a retired tag leaves the catalogue but stays on profiles that picked it", async ({
    page,
  }) => {
    // Find one Energy tag that the member really has, and the member's
    // address, from the database, so the test doesn't depend on which tag the
    // cohort happened to give them.
    const pick = await prisma!.profileTag.findFirstOrThrow({
      where: { userId: member, tag: { categoryId: "energy" } },
      include: { tag: true, profile: true },
    });
    const tagName = pick.tag.name;
    // Remember it, so afterAll can un-retire it.
    tagsToRestore.add(pick.tag.id);
    const profileAddress = `/people/${aliasToAddress(pick.profile.alias)}`;

    await page.goto("/admin/categories");
    await pressOnCardWith(page, `#name-${pick.tag.id}`, "Retire");

    // No longer listed in the catalogue...
    await page.goto("/catalogue");
    await expect(page.getByText(tagName, { exact: true })).toHaveCount(0);

    // ...but the person who picked it still shows it.
    await page.goto(profileAddress);
    await expect(page.getByText(tagName, { exact: true })).toBeVisible();
  });

  // Success check (admin spec): "A suspended user ... disappears from the
  // graph and search". We use the people list, which is the same rule
  // (visiblePeople) as the graph.
  test("a suspended person vanishes from the people list and can come back", async ({ page }) => {
    const person = await prisma!.profile.findUniqueOrThrow({
      where: { userId: personToSuspend },
    });
    const listedAliases = async () => {
      await page.goto("/people");
      return page.getByTestId("people-list").getByRole("listitem").allTextContents();
    };
    const isListed = async () =>
      (await listedAliases()).some((text) => text.includes(person.alias));

    expect(await isListed()).toBe(true);

    // Suspend them from the users screen. Their card is found by email.
    await page.goto("/admin/users");
    const user = await prisma!.user.findUniqueOrThrow({ where: { id: personToSuspend } });
    const userCard = page.getByRole("listitem").filter({ hasText: user.email });
    await userCard.getByRole("button", { name: "Suspend", exact: true }).click();
    await expect(userCard.getByText("Suspended", { exact: true })).toBeVisible();

    expect(await isListed()).toBe(false);

    // And bring them back, so later tests see the full cohort.
    await page.goto("/admin/users");
    await userCard.getByRole("button", { name: "Unsuspend", exact: true }).click();
    await expect(userCard.getByText("Suspended", { exact: true })).toHaveCount(0);

    expect(await isListed()).toBe(true);
  });

  test("an admin has no Suspend button on their own row", async ({ page }) => {
    const user = await prisma!.user.findUniqueOrThrow({ where: { id: admin } });
    await page.goto("/admin/users");

    const ownCard = page.getByRole("listitem").filter({ hasText: user.email });
    await expect(ownCard.getByText("(you)")).toBeVisible();
    await expect(ownCard.getByRole("button")).toHaveCount(0);
  });

  // Admin spec: "Remove a photo". We give someone a photo key directly in the
  // database (the file itself doesn't need to exist: removing is forgiving
  // about that), then remove it from the users screen.
  test("an admin removes a photo and the rest of the profile stays", async ({ page }) => {
    const before = await prisma!.profile.findUniqueOrThrow({
      where: { userId: personWithPhoto },
      include: { tags: true },
    });
    await prisma!.profile.update({
      where: { userId: personWithPhoto },
      data: { photoKey: `photos/${personWithPhoto}/e2e-test.jpg` },
    });
    const user = await prisma!.user.findUniqueOrThrow({ where: { id: personWithPhoto } });

    await page.goto("/admin/users");
    const card = page.getByRole("listitem").filter({ hasText: user.email });
    await expect(card.getByText("Has a photo")).toBeVisible();

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.request().headers()["next-action"] !== undefined,
      ),
      card.getByRole("button", { name: "Remove photo", exact: true }).click(),
    ]);

    await expect(card.getByText("Has a photo")).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Remove photo" })).toHaveCount(0);

    const after = await prisma!.profile.findUniqueOrThrow({
      where: { userId: personWithPhoto },
      include: { tags: true },
    });
    expect(after.photoKey).toBeNull();
    // Alias, silhouette and picks are unchanged.
    expect(after.alias).toBe(before.alias);
    expect(after.silhouette).toBe(before.silhouette);
    expect(after.tags.map((tag) => tag.tagId).sort()).toEqual(
      before.tags.map((tag) => tag.tagId).sort(),
    );
  });
});
