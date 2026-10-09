// Browser tests for the cohort graph at /graph (slice 4, #11, task 4.5).
//
// A test can't see inside a <canvas>: to the browser it is one flat picture.
// So these tests check everything AROUND the picture that carries the same
// information: the legend, the counts on the container, and the "Your top 5"
// and "Your glitch match" links (design decision 5). Whether the picture
// itself is readable is checked by eye (task 4.4).
//
// These need the pretend cohort and a server with it switched on, so they
// only run locally. Against a deployed site (BASE_URL set) they are skipped.

import { expect, test } from "@playwright/test";

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

// People from the pretend cohort (see the README's "Pretend cohort" table).
const member = "pretend-user-02"; // has a finished profile
const notOnboarded = "pretend-user-31"; // has no profile yet

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

// The box the canvas sits in. It carries the counts as data- attributes.
const graphBox = (page: import("@playwright/test").Page) => page.getByTestId("cohort-graph");

test.describe("as someone with a finished profile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await signInAs(page, member);
    await page.goto("/graph");
  });

  // Spec scenario: "See the whole cohort"
  test("draws the graph on a canvas", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Graph" })).toBeVisible();
    // The canvas only appears once the graph library has loaded in the
    // browser, so this also proves the library works.
    await expect(graphBox(page).locator("canvas")).toBeVisible();
  });

  test("counts every visible person and every pair's score", async ({ page }) => {
    // The cohort has 30 finished profiles and one of them is suspended, so
    // 29 people are visible. Every pair of them has a score:
    // 29 x 28 / 2 = 406.
    await expect(graphBox(page)).toHaveAttribute("data-node-count", "29");
    await expect(graphBox(page)).toHaveAttribute("data-edge-count", "406");
  });

  test("has a legend that names both courses and explains the shapes", async ({ page }) => {
    const legend = page.getByTestId("graph-legend");

    await expect(legend).toContainText("Software");
    await expect(legend).toContainText("Business");
    await expect(legend).toContainText("You");
    await expect(legend).toContainText("Your top 5");
    await expect(legend).toContainText("Your glitch match");
    await expect(legend).toContainText("Thicker line, higher score");
    await expect(legend).toContainText("Dashed line, a glitch match");
  });

  // Spec scenario: "Find my own matches"
  test("lists your top 5 and your glitch match as links, in words", async ({ page }) => {
    const topFiveLinks = page.getByTestId("top-five-list").getByRole("link");
    const glitchLinks = page.getByTestId("glitch-match").getByRole("link");

    await expect(topFiveLinks).toHaveCount(5);
    await expect(glitchLinks).toHaveCount(1);

    // The glitch match is, by the matching rules, never one of the top 5.
    const topFiveNames = await topFiveLinks.allTextContents();
    const glitchName = await glitchLinks.first().textContent();
    expect(topFiveNames).not.toContain(glitchName);
  });

  test("each top 5 link, and the glitch link, opens that person's profile", async ({ page }) => {
    // Collect the addresses first, because following a link leaves the page.
    const links = page
      .getByTestId("top-five-list")
      .getByRole("link")
      .or(page.getByTestId("glitch-match").getByRole("link"));
    const addresses = await links.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href")),
    );

    expect(addresses).toHaveLength(6);
    for (const address of addresses) {
      // An alias address: lower-case words joined by dashes, nothing else.
      expect(address).toMatch(/^\/people\/[a-z0-9]+(-[a-z0-9]+)*$/);

      const response = await page.goto(address!);
      expect(response?.status()).toBe(200);
    }
  });

  // Spec scenario: "Phone width"
  test("at phone width the graph fits and nothing scrolls sideways", async ({ page }) => {
    // 375 pixels is a common small phone.
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto("/graph");
    await expect(graphBox(page).locator("canvas")).toBeVisible();

    // If anything stuck out past the right edge, the page's full width
    // (scrollWidth) would be bigger than the screen's (clientWidth).
    const widths = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      screen: document.documentElement.clientWidth,
    }));
    expect(widths.page).toBeLessThanOrEqual(widths.screen);

    // And the canvas itself is no wider than the screen.
    const canvasWidth = await graphBox(page)
      .locator("canvas")
      .evaluate((canvas) => canvas.clientWidth);
    expect(canvasWidth).toBeLessThanOrEqual(375);
  });

  // Spec: no email ever reaches the browser.
  test("sends no email address or database id to the browser", async ({ page }) => {
    // page.content() is the whole page as the browser received it. That
    // includes the graph's data, which Next.js embeds in the page so the
    // browser can draw it.
    const graphHtml = await page.content();

    // Every pretend user's email ends "@collabz.test".
    expect(graphHtml).not.toContain("@collabz.test");

    // Database ids are harder to check, because one thing on the page is
    // ALLOWED to contain them: the dev switcher's list (that is its job, and
    // it doesn't exist on the live site). So instead of "none", we check
    // "no more than a page with no graph on it". /catalogue has the same
    // switcher and nothing else about people, so if /graph mentions a
    // pretend user id more often than /catalogue does, the graph leaked it.
    await page.goto("/catalogue");
    const catalogueHtml = await page.content();

    const countIds = (html: string) => html.split("pretend-user-").length - 1;
    expect(countIds(catalogueHtml)).toBeGreaterThan(0); // the switcher is there
    expect(countIds(graphHtml)).toBe(countIds(catalogueHtml));
  });
});

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto("/graph");

  await expect(page).toHaveURL(/\/signin$/);
});

test("someone who hasn't finished onboarding is sent to onboarding", async ({ page }) => {
  await page.goto("/");
  await signInAs(page, notOnboarded);

  await page.goto("/graph");

  await expect(page).toHaveURL(/\/onboarding$/);
});
