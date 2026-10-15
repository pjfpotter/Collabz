// Browser test for slice 10 (#45), task 10.2: at phone width (375px) no
// restyled page scrolls sideways, in the light and the dark theme.
//
// WHY ONE FILE FOR EVERY ROUTE: the visual-design spec says "every screen
// works at phone width first". The nav bar has its own version of this check
// (navigation.spec.ts); this one visits every other restyled page, so a new
// wide element anywhere is caught by one failing test that names the page.
//
// HOW IT CHECKS: if anything sticks out past the right edge, the page's full
// width (scrollWidth) is bigger than the visible width (clientWidth).
//
// It signs in as pretend users, so it needs the pretend cohort, and it
// skips itself on a deployed site (where there is none).

import { expect, test, type Page } from "@playwright/test";

import { signInAs, signOut } from "../helpers/devSignIn";

const testingDeployedSite = Boolean(process.env.BASE_URL);

// The pretend users the switcher offers (the same ids switcher.spec.ts uses).
const admin = "pretend-user-01";
const member = "pretend-user-02";

// Pages anyone can open without signing in. /does-not-exist is the 404 page.
const publicRoutes = [
  "/",
  "/signup",
  "/signin",
  "/catalogue",
  "/privacy",
  "/terms",
  "/does-not-exist",
];

// Pages for a member with a finished profile.
const memberRoutes = [
  "/matches",
  "/graph",
  "/people",
  "/requests",
  "/messages",
  "/account",
];

// Pages only an admin can open.
const adminRoutes = [
  "/admin",
  "/admin/categories",
  "/admin/courses",
  "/admin/users",
  "/admin/reports",
];

// How many pixels stick out past the right edge. 0 is what we want.
async function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

// Opens a route and checks it. The route name is in the failure message, so a
// failing run says which page is too wide.
async function expectFits(page: Page, route: string) {
  await page.goto(route);
  // The graph draws on a canvas after the page loads; give it a moment to
  // size itself before measuring.
  await page.waitForLoadState("networkidle");
  expect(await sidewaysOverflow(page), `${route} sticks out sideways`).toBe(0);
}

// The address of the first link on the current page that starts with a prefix.
async function firstLinkWith(page: Page, prefix: string): Promise<string | null> {
  const link = page.locator(`a[href^="${prefix}"]`).first();
  return (await link.count()) > 0 ? link.getAttribute("href") : null;
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`at 375px in ${scheme} mode`, () => {
    test.use({ viewport: { width: 375, height: 700 }, colorScheme: scheme });
    // Every page is compiled the first time it is opened in dev, which is slow.
    test.setTimeout(240_000);

    test("public pages fit", async ({ page }) => {
      for (const route of publicRoutes) {
        await expectFits(page, route);
      }
    });

    test("member pages fit, with a person's profile and a conversation", async ({ page }) => {
      test.skip(testingDeployedSite, "Needs the pretend cohort");
      await page.goto("/catalogue");
      await signInAs(page, member);

      for (const route of memberRoutes) {
        await expectFits(page, route);
      }

      // The pages with an address that depends on the data: a profile, a
      // conversation and an account edit page, found by following a link.
      await page.goto("/matches");
      const profile = await firstLinkWith(page, "/people/");
      expect(profile, "the matches page links to a profile").not.toBeNull();
      await expectFits(page, profile!);

      await page.goto("/messages");
      const thread = await firstLinkWith(page, "/messages/");
      if (thread) {
        await expectFits(page, thread);
      }

      await page.goto("/account");
      const edit = await firstLinkWith(page, "/account/edit/");
      if (edit) {
        await expectFits(page, edit);
      }

      await signOut(page);
    });

    test("admin pages fit", async ({ page }) => {
      test.skip(testingDeployedSite, "Needs the pretend cohort");
      await page.goto("/catalogue");
      await signInAs(page, admin);

      for (const route of adminRoutes) {
        await expectFits(page, route);
      }
    });
  });
}
