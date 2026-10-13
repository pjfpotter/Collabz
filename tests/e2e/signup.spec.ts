// Browser tests for signing up (slice 1, #8, tasks 4.1-4.3). One test per
// scenario in the user-auth spec's "Sign-up records the user's course" and
// "First admins come from the deployment's settings" requirements.
//
// New people sign up with made-up @collabz.test addresses, whose links go to
// the test inbox (tests/helpers/magicLinkSignIn.ts) instead of being emailed.
// So these only run locally. Against a deployed site (BASE_URL set) they are
// skipped.

import { rm } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { seedCatalogue } from "../../prisma/seed";
import { createTestDatabaseClient, emptyDatabase } from "../helpers/database";
import { readMagicLink, requestMagicLink } from "../helpers/magicLinkSignIn";

const testingDeployedSite = Boolean(process.env.BASE_URL);
test.skip(testingDeployedSite, "Reads links from the test inbox, so only runs locally");

const prisma = testingDeployedSite ? null : createTestDatabaseClient();

test.beforeEach(async () => {
  if (!prisma) return;
  // Every test starts with no users at all, just the catalogue (which holds
  // the courses), so each new sign-up really is new.
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

test.afterAll(async () => {
  await prisma?.$disconnect();
});

const signUpButton = { name: "Sign up", exact: true };

// Fills in /signup. Leave a field out by passing "" or false.
async function fillSignUpForm(
  page: Page,
  answers: { email: string; course: string; acceptTerms: boolean },
) {
  await page.goto("/signup");
  await page.getByLabel("Email address").fill(answers.email);
  if (answers.course) {
    await page.getByLabel("Your course").selectOption({ label: answers.course });
  }
  if (answers.acceptTerms) {
    await page.getByLabel(/I accept the/).check();
  }
  // Turn off the browser's own "please fill in this field" checks, so we
  // test OUR checks, which also protect the server. (The page has two forms,
  // this one and the dev switcher's.)
  const signUpForm = page.locator("form", { has: page.getByLabel("Email address") });
  await signUpForm.evaluate((form) => form.setAttribute("novalidate", ""));
}

// Deletes any old link for this address, so "no link was sent" can be checked.
async function clearInbox(email: string) {
  await rm(path.join(process.cwd(), ".magic-links", `${email}.txt`), { force: true });
}

test("a new student signs up, opens the link in another browser, and lands on onboarding", async ({
  page,
  browser,
}) => {
  const email = "new-student@collabz.test";
  await clearInbox(email);

  await fillSignUpForm(page, { email, course: "Business", acceptTerms: true });
  await page.getByRole("button", signUpButton).click();
  await expect(page.getByTestId("check-email")).toBeVisible();
  const link = await readMagicLink(email);

  // A fresh browser context has no cookies, like Gmail's own browser on a
  // phone opening the link (spec: "Link opened in a different browser").
  const otherBrowser = await browser.newContext();
  const phone = await otherBrowser.newPage();
  await phone.goto(link);

  // The answers came with the link: already filled in, one tap to finish.
  await expect(phone).toHaveURL(/\/signup\/finish\?course=business&terms=accepted/);
  await expect(phone.getByLabel("Your course")).toHaveValue("business");
  await expect(phone.getByLabel(/I accept the/)).toBeChecked();
  await phone.getByRole("button", { name: "Finish sign-up" }).click();

  // Spec "Successful sign-up": an account exists with course Business, and
  // they are taken to onboarding.
  await expect(phone).toHaveURL("/onboarding");
  await expect(phone.getByTestId("signed-in-status")).toContainText(`Signed in as ${email}`);

  const saved = await prisma!.user.findUniqueOrThrow({ where: { email } });
  expect(saved.courseId).toBe("business");
  expect(saved.acceptedTermsAt).not.toBeNull();
  expect(saved.role).toBe("MEMBER");

  await otherBrowser.close();
});

test("without accepting the terms, no link is sent and no account is made", async ({ page }) => {
  const email = "no-terms@collabz.test";
  await clearInbox(email);

  await fillSignUpForm(page, { email, course: "Software", acceptTerms: false });
  await page.getByRole("button", signUpButton).click();

  await expect(page.locator("#terms-problem")).toContainText("Accept the Terms");
  await expect(page.getByTestId("check-email")).toHaveCount(0);
  // What they filled in is kept, so they only have to tick the box.
  await expect(page.getByLabel("Email address")).toHaveValue(email);
  await expect(page.getByLabel("Your course")).toHaveValue("software");

  expect(await prisma!.user.count({ where: { email } })).toBe(0);
  expect(await prisma!.verificationToken.count()).toBe(0);
});

test("without a course, no link is sent (spec: Course not chosen)", async ({ page }) => {
  await fillSignUpForm(page, { email: "no-course@collabz.test", course: "", acceptTerms: true });
  await page.getByRole("button", signUpButton).click();

  await expect(page.locator("#course-problem")).toContainText("Choose your course");
  await expect(page.getByTestId("check-email")).toHaveCount(0);
  expect(await prisma!.verificationToken.count()).toBe(0);
});

test("without an email, nothing is sent", async ({ page }) => {
  await fillSignUpForm(page, { email: "", course: "Software", acceptTerms: true });
  await page.getByRole("button", signUpButton).click();

  await expect(page.locator("#email-problem")).toContainText("Enter your email address");
  expect(await prisma!.verificationToken.count()).toBe(0);
});

test("a new email used on /signin is asked for course and terms first", async ({ page }) => {
  const email = "came-via-signin@collabz.test";

  const link = await requestMagicLink(page, email);
  await page.goto(link);

  // No answers in the link: an empty course list and an unticked box.
  await expect(page).toHaveURL("/signup/finish");
  await expect(page.getByLabel("Your course")).toHaveValue("");
  await expect(page.getByLabel(/I accept the/)).not.toBeChecked();

  // Until they finish, the rest of the app treats them as signed out
  // (spec: "Unfinished account opens another page"): /admin sends anyone
  // who isn't signed in to /signin, and /signin sends them back here.
  await page.goto("/admin");
  await expect(page).toHaveURL("/signup/finish");
});

test("an email on ADMIN_EMAILS becomes an admin when it signs up", async ({ page }) => {
  // Set for the test server in playwright.config.ts.
  const email = "first-admin@collabz.test";
  await clearInbox(email);

  await fillSignUpForm(page, { email, course: "Software", acceptTerms: true });
  await page.getByRole("button", signUpButton).click();
  await page.goto(await readMagicLink(email));
  await page.getByRole("button", { name: "Finish sign-up" }).click();
  await expect(page).toHaveURL("/onboarding");

  // The admin page opens for them (a member would see "page not found").
  await page.goto("/admin");
  await expect(page).toHaveURL("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("This page could not be found")).toHaveCount(0);
});

// user-auth spec: "Read the policy before signing up". No one is signed in
// here (each Playwright test starts with no cookies).
test("the terms and data policy open without signing in", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms & Conditions");

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Data policy");
});

// user-auth spec: "Policy covers photos and messages".
test("the data policy covers photos, messages, who sees them and deletion", async ({ page }) => {
  await page.goto("/privacy");
  const policy = page.locator("main");

  await expect(policy).toContainText("photo");
  await expect(policy).toContainText("Messages");
  await expect(policy).toContainText("Who can see what");
  await expect(policy).toContainText("The admins will delete all accounts");
  await expect(policy).toContainText("26 November 2026");
});

test("the sign-up form links to both documents", async ({ page, context }) => {
  await page.goto("/signup");

  // The links open in a new tab (so the form isn't lost), so wait for it.
  for (const [linkText, heading] of [
    ["Terms & Conditions", "Terms & Conditions"],
    ["data policy", "Data policy"],
  ]) {
    const [newTab] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("link", { name: linkText, exact: true }).click(),
    ]);
    await expect(newTab.getByRole("heading", { level: 1 })).toHaveText(heading);
    await newTab.close();
  }
});

test("the sign-up page fits a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/signup");

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});
