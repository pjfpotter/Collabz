// Browser tests for signing in and out with a real magic link (slice 1, #8,
// task 3.6). One test per scenario in the user-auth spec's "Sign in and sign
// out", "Suspended users can't sign in" and "Magic links are single-use and
// expire" requirements.
//
// Links for pretend @collabz.test addresses are read from the test inbox
// (tests/helpers/magicLinkSignIn.ts), so these need the pretend cohort and
// only run locally. Against a deployed site (BASE_URL set) they are skipped.

import { expect, test } from "@playwright/test";

import { seedCatalogue } from "../../prisma/seed";
import {
  createTestDatabaseClient,
  emptyDatabase,
  loadPretendCohortForTests,
} from "../helpers/database";
import { requestMagicLink } from "../helpers/magicLinkSignIn";

const testingDeployedSite = Boolean(process.env.BASE_URL);
test.skip(testingDeployedSite, "Needs the pretend cohort, so only runs against the test database");

const prisma = testingDeployedSite ? null : createTestDatabaseClient();

// From the pretend cohort (see the README's "Pretend cohort" table):
// a finished member, and the suspended user.
const memberEmail = "pretend-02@collabz.test";
const suspendedEmail = "pretend-30@collabz.test";

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

const status = '[data-testid="signed-in-status"]';

test("a member signs in with a magic link, stays signed in, and signs out", async ({ page }) => {
  const link = await requestMagicLink(page, memberEmail);
  await page.goto(link);

  // A finished account goes from /signin straight to the home page.
  await expect(page).toHaveURL("/");
  await expect(page.locator(status)).toContainText(`Signed in as ${memberEmail}`);

  // Still signed in on another page.
  await page.goto("/catalogue");
  await expect(page.locator(status)).toContainText(`Signed in as ${memberEmail}`);

  // Sign out (spec scenario "Sign out").
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.locator(status)).toHaveText("Not signed in");

  // A private page now asks them to sign in again: /admin sends anyone who
  // isn't signed in to /signin (foundation's requireAdmin()).
  await page.goto("/admin");
  await expect(page).toHaveURL("/signin");
});

test("a magic link only works once (spec: Link used twice)", async ({ page, browser }) => {
  const link = await requestMagicLink(page, memberEmail);

  // First use signs in.
  await page.goto(link);
  await expect(page.locator(status)).toContainText("Signed in as");

  // Second use, in a fresh browser with no cookies, is refused.
  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  await freshPage.goto(link);

  await expect(freshPage.getByTestId("signin-message")).toContainText(
    "already been used or has expired",
  );
  await expect(freshPage.locator(status)).toHaveText("Not signed in");
  await freshContext.close();
});

test("a suspended user can't sign in (spec: Suspended user tries to sign in)", async ({ page }) => {
  // Asking for a link isn't refused (so the form doesn't reveal who is
  // suspended); USING it is.
  const link = await requestMagicLink(page, suspendedEmail);
  await page.goto(link);

  await expect(page.getByTestId("signin-message")).toContainText("This account is suspended");
  await expect(page.locator(status)).toHaveText("Not signed in");
});

test("a mistyped email is caught before any link is sent", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel("Email address").fill("not-an-email");
  // The browser's own check for type="email" would stop the form being sent
  // at all, so turn it off to test OUR check, which also protects the server.
  // (The page has two forms: this one and the dev switcher's, so we pick the
  // one with the email box in it.)
  const signInForm = page.locator("form", { has: page.getByLabel("Email address") });
  await signInForm.evaluate((form) => form.setAttribute("novalidate", ""));
  await page.getByRole("button", { name: /email me a sign-in link/i }).click();

  // #email-problem is the message under the email box (SignInForm.tsx).
  await expect(page.locator("#email-problem")).toContainText(
    "doesn't look like an email address",
  );
  await expect(page.getByTestId("check-email")).toHaveCount(0);
});
