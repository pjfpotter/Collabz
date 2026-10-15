// Browser tests for the public graph demo (change: graph-demo, task 4.4).
// One test per scenario in the graph-demo spec
// (openspec/changes/graph-demo/specs/graph-demo/spec.md).
//
// WHY "NO PRETEND" IS CHECKED ON THE PAGE'S <main> AND NOT THE WHOLE PAGE:
// while the pretend cohort is switched on (every dev machine and the test
// run), the nav bar at the top of EVERY page carries the dev sign-in list,
// whose entries are called "The Pretend ...". That list is not part of the
// demo and never exists in production. The demo's own content is what the
// spec is about, and that is inside <main>.
//
// WHY THE GRAPH IS CHECKED THROUGH data- ATTRIBUTES AND THE LISTS: nothing
// inside the canvas can be read from outside, so the page also writes the
// counts on the box and the top 5 as ordinary text (the same approach as
// /graph and graph.spec.ts).
//
// Only the signed-in test needs the pretend cohort, so only that one is
// skipped against a deployed site (BASE_URL set). The rest read nothing from
// the database and run anywhere.

import { expect, test, type Locator, type Page } from "@playwright/test";

import { seedCatalogue } from "../../prisma/seed";
import { createTestDatabaseClient, emptyDatabase, loadPretendCohortForTests } from "../helpers/database";
import { signInAs } from "../helpers/devSignIn";

const testingDeployedSite = Boolean(process.env.BASE_URL);

// The demo cohort has 40 invented people (src/lib/graphDemo/demoCohort.ts).
const DEMO_PEOPLE = 40;

// The graph's box, the status line and the top 5 list.
const graphOn = (page: Page) => page.getByTestId("demo-graph");
const statusOn = (page: Page) => page.getByTestId("demo-status");
const topFiveOn = (page: Page) => page.getByTestId("demo-top-five");
const pickerOn = (page: Page) => page.getByTestId("demo-picker");

// Opens the "Be someone" panel, which is closed until asked for.
async function openPicker(page: Page) {
  await page.getByText("Be someone: pick your tags").click();
}

// One pick from a group, by position. The cards' real inputs are visually
// hidden (so a keyboard works) and a forced click on them does not toggle
// them, so we click the card (the <label>) the way a finger would.
async function pickNth(page: Page, group: string, position: number) {
  const card = pickerOn(page).locator(`label:has(input[name="${group}"])`).nth(position);
  await card.click();
}

// Picks the smallest complete set: one in every group.
async function pickOneOfEach(page: Page, energyPosition = 0) {
  await pickNth(page, "heroStory", 0);
  await pickNth(page, "energy", energyPosition);
  await pickNth(page, "vibeDiagnosis", 0);
  await pickNth(page, "qualities", 0);
  await pickNth(page, "seeking", 0);
}

// The top 5 as plain text, in order.
async function topFiveText(list: Locator): Promise<string[]> {
  return (await list.locator("li").allTextContents()).map((text) => text.trim());
}

// Spec scenarios: "A visitor with no account" and "Production with no pretend
// cohort" (this page reads nothing, so it works the same either way)
test("a visitor with no account sees the graph with the invented people", async ({ page }) => {
  await page.goto("/demo/graph");

  await expect(page.getByRole("heading", { name: "Try the graph", level: 1 })).toBeVisible();
  await expect(graphOn(page)).toHaveAttribute("data-node-count", String(DEMO_PEOPLE));
  // A line for every pair: 40 people have 40 x 39 / 2 = 780.
  await expect(graphOn(page)).toHaveAttribute("data-edge-count", "780");
  // The graph really drew itself.
  await expect(graphOn(page).locator("canvas")).toBeVisible();
});

// Spec scenario: "A signed-in student sees the same demo"
test("a signed-in student sees the same invented people, and nothing real", async ({ page }) => {
  test.skip(testingDeployedSite, "Needs the pretend cohort, so only runs against the test database");

  const prisma = createTestDatabaseClient();
  try {
    await emptyDatabase(prisma);
    await seedCatalogue(prisma);
    await loadPretendCohortForTests(prisma);
  } finally {
    await prisma.$disconnect();
  }

  await signInAs(page, "pretend-user-02");
  await page.goto("/demo/graph");

  await expect(graphOn(page)).toHaveAttribute("data-node-count", String(DEMO_PEOPLE));
  // None of the pretend cohort's people are in the demo.
  await expect(page.locator("main")).not.toContainText(/pretend/i);
});

// Spec scenarios: "Names look like the real thing" and (the requirement's
// "no alias or label SHALL contain Pretend")
test("nothing on the demo says Pretend", async ({ page }) => {
  await page.goto("/demo/graph");
  await openPicker(page);
  await pickOneOfEach(page);

  await expect(page.locator("main")).not.toContainText(/pretend/i);
});

// Spec scenarios: "Picking changes the graph" and "Picking different tags
// gives different matches"
test("picking tags puts the visitor on the graph and changes who is in the top 5", async ({
  page,
}) => {
  await page.goto("/demo/graph");
  await expect(statusOn(page)).toContainText("Pick at least one tag in every group");

  await openPicker(page);
  await pickOneOfEach(page, 0);

  // The visitor is a 41st dot, and there are five matches and a glitch match.
  await expect(graphOn(page)).toHaveAttribute("data-node-count", String(DEMO_PEOPLE + 1));
  await expect(statusOn(page)).toContainText("You are on the graph now");
  await expect(topFiveOn(page).locator("li")).toHaveCount(5);
  await expect(page.getByTestId("demo-glitch")).toBeVisible();
  const first = await topFiveText(topFiveOn(page));

  // A different Energy gives different matches.
  await pickNth(page, "energy", 4);
  await expect.poll(() => topFiveText(topFiveOn(page))).not.toEqual(first);
});

// Spec scenario: "Nothing is kept"
test("reloading starts again with nothing picked", async ({ page }) => {
  await page.goto("/demo/graph");
  await openPicker(page);
  await pickOneOfEach(page);
  await expect(graphOn(page)).toHaveAttribute("data-node-count", String(DEMO_PEOPLE + 1));

  await page.reload();

  await expect(graphOn(page)).toHaveAttribute("data-node-count", String(DEMO_PEOPLE));
  await expect(statusOn(page)).toContainText("Pick at least one tag in every group");
});

// Spec scenario: "Pick limits hold"
test("a group stops accepting picks at its limit", async ({ page }) => {
  await page.goto("/demo/graph");
  await openPicker(page);

  // Qualities allow up to 4. Tick the first four...
  for (let position = 0; position < 4; position += 1) {
    await pickNth(page, "qualities", position);
  }

  // ...and every remaining one is switched off.
  const qualities = pickerOn(page).locator('input[name="qualities"]');
  const total = await qualities.count();
  for (let position = 4; position < total; position += 1) {
    await expect(qualities.nth(position)).toBeDisabled();
  }
});

// The "Start again" button, which is not in a spec scenario but is the only
// way back without reloading.
test("Start again clears every pick", async ({ page }) => {
  await page.goto("/demo/graph");
  await openPicker(page);
  await pickOneOfEach(page);

  await page.getByRole("button", { name: "Start again" }).click();

  await expect(graphOn(page)).toHaveAttribute("data-node-count", String(DEMO_PEOPLE));
  await expect(pickerOn(page).locator("input:checked")).toHaveCount(0);
});

// Spec scenarios: "No account actions" and "The demo says what it is"
test("offers nothing that needs an account, and says what it is", async ({ page }) => {
  await page.goto("/demo/graph");
  const main = page.locator("main");

  // No Connect button and no link to a profile page anywhere in the demo.
  await expect(main.getByRole("button", { name: /connect/i })).toHaveCount(0);
  await expect(main.locator('a[href^="/people/"]')).toHaveCount(0);

  // It says the people are made up and nothing is saved, and links to sign up.
  await expect(main).toContainText("made-up people");
  await expect(main).toContainText("Nothing you pick is saved");
  await expect(main.getByRole("link", { name: "Sign up for the real thing" })).toHaveAttribute(
    "href",
    "/signup",
  );
});

// Spec scenario: "Phone width" (both themes, like phoneWidth.spec.ts)
for (const scheme of ["light", "dark"] as const) {
  test.describe(`at 375px in ${scheme} mode`, () => {
    test.use({ viewport: { width: 375, height: 700 }, colorScheme: scheme });

    test("the demo does not scroll sideways, and the picker opens and closes", async ({ page }) => {
      await page.goto("/demo/graph");
      await expect(graphOn(page).locator("canvas")).toBeVisible();

      const overflow = () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
      expect(await overflow(), "closed picker sticks out sideways").toBe(0);

      await openPicker(page);
      await expect(pickerOn(page)).toBeVisible();
      expect(await overflow(), "open picker sticks out sideways").toBe(0);

      await page.getByText("Be someone: pick your tags").click();
      await expect(pickerOn(page)).toBeHidden();
    });
  });
}
