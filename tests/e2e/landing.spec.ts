// Browser tests for the animated home page (change: landing-page-demo, task
// 3.1). One test per scenario in the landing-page spec
// (openspec/changes/landing-page-demo/specs/landing-page/spec.md).
//
// WHY EVERY BUTTON CHECK IS SCOPED TO "landing-actions": the nav bar at the
// top of every page ALSO has "Sign up" and "Sign in" links. Looking for those
// words on the whole page would find the nav bar's links and prove nothing
// about the home page's own buttons.
//
// The signed-in test needs a pretend student, so it needs the pretend cohort
// and is skipped against a deployed site (BASE_URL set). The rest read nothing
// from the database and run anywhere.

import { expect, test, type Page } from "@playwright/test";

import { seedCatalogue } from "../../prisma/seed";
import {
  createTestDatabaseClient,
  emptyDatabase,
  loadPretendCohortForTests,
} from "../helpers/database";
import { signInAs } from "../helpers/devSignIn";

const testingDeployedSite = Boolean(process.env.BASE_URL);

// A pretend student with a finished profile (the same id switcher.spec.ts
// calls "member").
const student = "pretend-user-02";

// The box the page's own buttons sit in (src/components/landing/LandingActions.tsx).
const actionsOn = (page: Page) => page.getByTestId("landing-actions");

// The demo picture (src/components/landing/DemoScene.tsx).
const demoOn = (page: Page) => page.getByTestId("landing-demo");

// Spec scenario: "A visitor"
test("a visitor sees Sign up and Sign in, and no Go to matches", async ({ page }) => {
  await page.goto("/");

  const actions = actionsOn(page);
  await expect(actions.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
  await expect(actions.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
  await expect(actions.getByRole("link", { name: "Go to matches" })).toHaveCount(0);
});

// Spec scenarios: "Someone lands cold" and "The catalogue is still reachable"
test("the page says what Collabz is, lists the four steps and links to the catalogue", async ({ page }) => {
  await page.goto("/");

  // The promise, in words, with no animation needed.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Collabz");
  await expect(page.getByText("Find people to work with by chemistry, not CVs.")).toBeVisible();

  // The four steps, as a real numbered list, in order.
  const steps = page.getByRole("region", { name: "How it works" }).getByRole("listitem");
  await expect(steps).toHaveCount(4);
  const titles = ["Pick", "Match", "Request", "Talk"];
  for (const [index, title] of titles.entries()) {
    await expect(steps.nth(index)).toContainText(title);
  }

  await expect(page.getByRole("link", { name: "See the tag catalogue" })).toHaveAttribute(
    "href",
    "/catalogue",
  );
});

// Spec scenario: "Screen reader"
test("the demo is one image with a description, and its shapes are hidden from a screen reader", async ({ page }) => {
  await page.goto("/");

  // role="img" with a label: a screen reader says this one sentence.
  const demo = demoOn(page);
  await expect(demo).toHaveAttribute("role", "img");
  await expect(demo).toHaveAttribute("aria-label", /made-up example of Collabz/);

  // Everything drawn inside is wrapped in an aria-hidden group.
  await expect(demo.locator(":scope > g[aria-hidden='true']")).toHaveCount(1);
});

// Spec scenario: "Reduced motion"
test("with reduced motion nothing animates and the finished picture is showing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  // Every animated piece: no animation running, fully visible.
  for (const hook of [
    ".demo-tags",
    ".demo-person",
    ".demo-link",
    ".demo-score",
    ".demo-reasons",
    ".demo-approve",
    ".demo-chat",
  ]) {
    const piece = demoOn(page).locator(hook).first();
    await expect(piece, `${hook} should not animate`).toHaveCSS("animation-name", "none");
    await expect(piece, `${hook} should be visible`).toHaveCSS("opacity", "1");
  }

  // The step caption is only for the moving version; the list says the same.
  await expect(page.locator(".demo-caption").first()).toBeHidden();
});

// Spec scenario: "The demo plays"
test("with no reduced-motion setting the demo animates", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  // Only checks that the animation is switched on, not what frame it is at:
  // timing-based checks on a 16-second loop would be flaky.
  await expect(demoOn(page).locator(".demo-link")).not.toHaveCSS("animation-name", "none");
});

// Spec scenarios: "A signed-in student" and "Nothing real is shown"
test("a signed-in student sees Go to matches only, and the same invented demo", async ({ page }) => {
  test.skip(testingDeployedSite, "Needs the pretend cohort, so only runs against the test database");

  const prisma = createTestDatabaseClient();
  try {
    await emptyDatabase(prisma);
    await seedCatalogue(prisma);
    await loadPretendCohortForTests(prisma);
  } finally {
    await prisma.$disconnect();
  }

  // What a visitor's demo says, to compare with below.
  await page.goto("/");
  const visitorDescription = await demoOn(page).getAttribute("aria-label");

  await signInAs(page, student);
  await page.goto("/");

  const actions = actionsOn(page);
  await expect(actions.getByRole("link", { name: "Go to matches" })).toHaveAttribute(
    "href",
    "/matches",
  );
  await expect(actions.getByRole("link", { name: "Sign up" })).toHaveCount(0);
  await expect(actions.getByRole("link", { name: "Sign in" })).toHaveCount(0);

  // Same invented people as for a visitor; nothing from the database.
  const studentDescription = await demoOn(page).getAttribute("aria-label");
  expect(studentDescription).toBe(visitorDescription);
  // Every pretend user's alias starts "The Pretend", so this would catch a
  // real one leaking in.
  expect(studentDescription).not.toContain("Pretend");
});

// Spec scenarios: "Phone width" and "Dark theme"
for (const scheme of ["light", "dark"] as const) {
  test(`at 375px in ${scheme} mode the page does not scroll sideways and both buttons show`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");

    // How many pixels stick out past the right edge. 0 is what we want.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);

    await expect(actionsOn(page).getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(actionsOn(page).getByRole("link", { name: "Sign in" })).toBeVisible();
  });
}
