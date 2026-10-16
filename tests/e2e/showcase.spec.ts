// Browser tests for the portfolio showcase pages: the interactive course and
// the architecture diagram (openspec/changes/portfolio-readme, spec
// "portfolio-showcase").
//
// WHY these need no database and no sign-in: both are plain files in public/,
// so the tests open them as a stranger would. That also makes every test safe
// to run against a deployed site (BASE_URL=https://<preview-url>), because
// nothing here changes any data.

import { expect, test } from "@playwright/test";

// Spec scenario: "A signed-out visitor opens the course"
test("the course opens with its styles and script, without signing in", async ({
  page,
}) => {
  await page.goto("/course/index.html");

  // The page title and the first module's heading come from the course itself.
  await expect(page).toHaveTitle("How Collabz Works");
  await expect(
    page.getByRole("heading", { level: 1, name: "What Collabz Does" }),
  ).toBeVisible();

  // We were not bounced to the sign-in page.
  expect(new URL(page.url()).pathname).toBe("/course/index.html");

  // The course's own stylesheet and script load from the same site (a broken
  // relative link would show up here as a 404).
  for (const file of ["styles.css", "main.js"]) {
    const response = await page.request.get(`/course/${file}`);
    expect(response.status(), `/course/${file}`).toBe(200);
  }
});

// Spec scenario: "The short address works"
test("/course sends the visitor to /course/index.html", async ({ page }) => {
  await page.goto("/course");

  // Playwright follows the redirect, so we check where we ended up.
  expect(new URL(page.url()).pathname).toBe("/course/index.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "What Collabz Does" }),
  ).toBeVisible();
});

// Spec scenario: "A visitor opens the diagram"
test("the architecture diagram opens without signing in", async ({ page }) => {
  await page.goto("/architecture.html");

  // The page is the Archify diagram; its title starts with the diagram's name.
  await expect(page).toHaveTitle(/How Collabz Fits Together/);
  await expect(
    page.getByRole("heading", { name: "How Collabz Fits Together" }),
  ).toBeVisible();

  // The theme switch (light and dark) is on the page.
  await expect(page.locator("#btn-theme")).toBeVisible();

  // We were not bounced to the sign-in page.
  expect(new URL(page.url()).pathname).toBe("/architecture.html");
});

// Spec scenario: "A visitor opens the slides on a phone"
test("the presentation slides open at slide 1 without signing in", async ({
  page,
}) => {
  await page.goto("/slides/collabz.html");

  // The deck shows a "slide / total" counter. We were not bounced to sign-in,
  // and the deck has 16 slides (a different total would mean the page and the
  // deck's own slide list have drifted apart).
  expect(new URL(page.url()).pathname).toBe("/slides/collabz.html");
  await expect(page.locator("section.deck-slide")).toHaveCount(16);
  await expect(page.locator(".deck-pager")).toHaveText("1 / 16");
});
