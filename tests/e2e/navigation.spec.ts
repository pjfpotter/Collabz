// Browser tests for the nav bar and the route plan (foundation #7, task 5.4).
// One test per scenario in the app-navigation spec
// (openspec/changes/7-foundation/specs/app-navigation/spec.md).
//
// None of these change any data or need anyone to be signed in, so they also
// run against a deployed site when BASE_URL is set.

import { expect, test } from "@playwright/test";

// Every link in the nav bar, with the heading its page should show.
//
// `needsProfile: true` marks a page that is BUILT and only for people with a
// finished profile. Nobody is signed in during these tests, so following that
// link ends up on the sign-in page instead. (What the page shows to someone
// who is signed in is tested in that page's own file, e.g. graph.spec.ts.)
// Keep this in step with `navLinks` in src/components/NavBar.tsx: if a link
// is added there, the "has a link to every page" test below fails until it
// is added here too.
const publicLinks = [
  { label: "Catalogue", path: "/catalogue", heading: "Tag catalogue" },
  { label: "Sign up", path: "/signup", heading: "Sign up" },
  { label: "Sign in", path: "/signin", heading: "Sign in" },
  { label: "Onboarding", path: "/onboarding", heading: "Onboarding" },
  { label: "Matches", path: "/matches", heading: "Matches" },
  { label: "Graph", path: "/graph", heading: "Graph", needsProfile: true },
  { label: "People", path: "/people", heading: "People", needsProfile: true },
  { label: "Requests", path: "/requests", heading: "Requests" },
  { label: "Messages", path: "/messages", heading: "Messages" },
  { label: "Account", path: "/account", heading: "Account" },
];

// The two admin links. Nobody is signed in during these tests, so following
// one ends up on the sign-in page (the admin check itself is tested in
// switcher.spec.ts).
const adminLinks = [
  { label: "Admin", path: "/admin" },
  { label: "Reports", path: "/admin/reports" },
];

// The nav bar's links, found the way a screen reader would: the navigation
// area named "Main".
const mainNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Main" });

test("the nav bar has a link to every page in the route plan", async ({ page }) => {
  await page.goto("/");

  const labels = await mainNav(page).getByRole("link").allTextContents();

  expect(labels).toEqual([
    "Collabz",
    ...publicLinks.map((link) => link.label),
    ...adminLinks.map((link) => link.label),
  ]);
});

// Spec scenario: "Reach any page from any page"
for (const link of publicLinks) {
  test(`the "${link.label}" link opens its page, with the nav bar still shown`, async ({ page }) => {
    // Start somewhere other than the home page, to show the links work from
    // any page and not just the first one.
    await page.goto("/messages");

    await mainNav(page).getByRole("link", { name: link.label, exact: true }).click();

    if (link.needsProfile) {
      // A built page that needs a finished profile: signed out, the link
      // leads to the sign-in page.
      await expect(page).toHaveURL(/\/signin$/);
    } else {
      await expect(page).toHaveURL(new RegExp(`${link.path}$`));
      await expect(page.getByRole("heading", { level: 1, name: link.heading })).toBeVisible();
    }
    await expect(mainNav(page)).toBeVisible();
  });
}

for (const link of adminLinks) {
  test(`the "${link.label}" link sends a signed-out visitor to sign in`, async ({ page }) => {
    await page.goto("/");

    await mainNav(page).getByRole("link", { name: link.label, exact: true }).click();

    await expect(page).toHaveURL(/\/signin$/);
    await expect(mainNav(page)).toBeVisible();
  });
}

test("the Collabz link goes back to the home page", async ({ page }) => {
  await page.goto("/requests");

  await mainNav(page).getByRole("link", { name: "Collabz" }).click();

  await expect(page).toHaveURL(/\/$/);
});

// Spec scenario: "A planned page that isn't built yet"
test("a page that isn't built yet says so and names who will build it", async ({ page }) => {
  await page.goto("/matches");

  await expect(page.getByRole("heading", { level: 1, name: "Matches" })).toBeVisible();
  await expect(page.getByText("This page is a placeholder.")).toBeVisible();
  await expect(page.getByText("Slice 3 (issue #10) will build it.")).toBeVisible();
});

// Spec scenario: "A page with a person in its address"
test("/people/ followed by any alias shows the profile placeholder, not an error", async ({ page }) => {
  const response = await page.goto("/people/the-feral-sea-captain");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
  await expect(page.getByText("Slice 4 (issue #11) will build it.")).toBeVisible();
});

// Spec scenario: "Existing pages are unchanged"
test("/catalogue still shows the catalogue, now under the nav bar", async ({ page }) => {
  await page.goto("/catalogue");

  await expect(mainNav(page)).toBeVisible();
  // The first category heading from the seed.
  await expect(page.getByRole("heading", { level: 2, name: "Hero Story" })).toBeVisible();
});

// Spec scenario: "Phone width"
test("at phone width every link is reachable and nothing scrolls sideways", async ({ page }) => {
  // 375 pixels is a common small phone.
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("/requests");

  for (const link of [...publicLinks, ...adminLinks]) {
    await expect(
      mainNav(page).getByRole("link", { name: link.label, exact: true }),
    ).toBeVisible();
  }

  // If anything stuck out past the right edge, the page's full width
  // (scrollWidth) would be bigger than the visible width (clientWidth).
  const sticksOutBy = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sticksOutBy).toBe(0);
});
