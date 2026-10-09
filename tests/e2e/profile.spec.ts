// Browser tests for a person's profile page at /people/[alias] and its
// Connect button (slice 4, #11, task 6.4). One test per scenario in the
// people-search spec.
//
// These need the pretend cohort and a server with it switched on, so they
// only run locally. Against a deployed site (BASE_URL set) they are skipped.

import { expect, test, type Page } from "@playwright/test";

import { seedCatalogue } from "../../prisma/seed";
import { aliasToAddress } from "../../src/lib/cohort/aliasAddress";
import {
  createTestDatabaseClient,
  emptyDatabase,
  loadPretendCohortForTests,
} from "../helpers/database";
import { signInAs, signOut } from "../helpers/devSignIn";

const testingDeployedSite = Boolean(process.env.BASE_URL);
test.skip(testingDeployedSite, "Needs the pretend cohort, so only runs against the test database");

const prisma = testingDeployedSite ? null : createTestDatabaseClient();

// People from the pretend cohort (see the README's "Pretend cohort" table).
const member = "pretend-user-02"; // has a finished profile; the tests sign in as them
const suspendedUser = "pretend-user-30"; // finished profile, but suspended
const notOnboarded = "pretend-user-31"; // has no profile yet

test.beforeAll(async () => {
  if (!prisma) return;
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  await loadPretendCohortForTests(prisma);
  // The pretend cohort comes with some connection requests already in it. A
  // person with a request shows the request's status in place of the Connect
  // button, so start from none and let the one test that needs a request add
  // its own.
  await prisma.connectionRequest.deleteMany();
});

test.afterAll(async () => {
  await prisma?.$disconnect();
});

// The profile address (/people/the-...) of a pretend user, worked out from
// their alias in the database, the same way the app does it.
async function addressOf(pretendUserId: string): Promise<string> {
  const profile = await prisma!.profile.findUniqueOrThrow({
    where: { userId: pretendUserId },
    select: { alias: true },
  });
  return `/people/${aliasToAddress(profile.alias)}`;
}

// The signed-in member's top 5 addresses and glitch match address, read from
// the links on /graph (the same words-list the graph tests use).
async function getMatchAddresses(page: Page) {
  await page.goto("/graph");
  const hrefs = (testId: string) =>
    page
      .getByTestId(testId)
      .getByRole("link")
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("href")!));
  return {
    topFive: await hrefs("top-five-list"),
    glitch: (await hrefs("glitch-match"))[0],
  };
}

// An address that is neither in the member's top 5 nor their glitch match.
async function getOutsiderAddress(page: Page): Promise<string> {
  const { topFive, glitch } = await getMatchAddresses(page);
  const matches = new Set([...topFive, glitch]);

  await page.goto("/people");
  // The list is best match first, so the LAST row is certainly not a top 5.
  const links = await page
    .getByTestId("people-list")
    .getByRole("listitem")
    .getByRole("link")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("href")!));
  const outsider = [...links].reverse().find((href) => !matches.has(href));
  if (!outsider) {
    throw new Error("Expected at least one person outside the top 5 and the glitch match");
  }
  return outsider;
}

test.describe("signed in as a member with a finished profile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await signInAs(page, member);
  });

  // Spec scenario: "Open a profile from the list"
  test("a profile opened from the list shows alias, silhouette, bio, course and tags", async ({
    page,
  }) => {
    await page.goto("/people");
    const firstLink = page.getByTestId("people-list").getByRole("listitem").first().getByRole("link");
    const alias = await firstLink.textContent();
    await firstLink.click();

    await expect(page.getByRole("heading", { level: 1, name: alias! })).toBeVisible();
    await expect(page.locator("svg[data-silhouette]").first()).toBeVisible();
    await expect(page.getByTestId("profile-bio")).not.toBeEmpty();
    // Scoped to the page's main area: the dev sign-in dropdown in the nav bar
    // also has "Software" and "Business" written in it.
    await expect(page.getByRole("main").getByText(/^(Software|Business)$/)).toBeVisible();
    // Tags are grouped under a heading per category.
    await expect(page.getByRole("heading", { level: 2, name: "Hero Story" })).toBeVisible();
    // And no email anywhere in the page.
    expect(await page.content()).not.toContain("@collabz.test");
  });

  // Spec scenario: "Found person outside top 5"
  test("a profile outside the top 5 shows the breakdown and no Connect button", async ({
    page,
  }) => {
    await page.goto(await getOutsiderAddress(page));

    await expect(page.getByRole("heading", { name: "Why you match" })).toBeVisible();
    await expect(page.getByTestId("match-score")).toContainText(/Score with you: \d+/);
    await expect(page.getByRole("button", { name: "Connect" })).toHaveCount(0);
  });

  // Spec scenario: "Person in the top 5"
  test("a top 5 profile shows the breakdown and a Connect button that says requests aren't on yet", async ({
    page,
  }) => {
    const { topFive } = await getMatchAddresses(page);
    await page.goto(topFive[0]);

    await expect(page.getByRole("heading", { name: "Why you match" })).toBeVisible();
    const connect = page.getByRole("button", { name: "Connect" });
    await expect(connect).toBeVisible();

    await connect.click();
    await expect(page.getByTestId("connect-message")).toHaveText(
      "Connection requests aren't switched on yet.",
    );
  });

  // Spec scenario: "Glitch match"
  test("the glitch match's profile shows Connect and says it is the glitch match", async ({
    page,
  }) => {
    const { glitch } = await getMatchAddresses(page);
    await page.goto(glitch);

    await expect(page.getByTestId("glitch-note")).toContainText("your glitch match");
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();
  });

  // Spec scenario: "Already requested or connected"
  test("an existing request is shown in place of the Connect button", async ({ page }) => {
    const { topFive } = await getMatchAddresses(page);
    const address = topFive[0];

    // Find who that is and add a pending request from them to the member.
    // (The Connect button is a stand-in until slice 5, so the row is added
    // directly.)
    const people = await prisma!.profile.findMany({ select: { alias: true, userId: true } });
    const person = people.find((candidate) => `/people/${aliasToAddress(candidate.alias)}` === address)!;
    await prisma!.connectionRequest.create({
      data: { fromUserId: person.userId, toUserId: member, status: "PENDING" },
    });

    try {
      await page.goto(address);
      await expect(page.getByTestId("request-status")).toBeVisible();
      await expect(page.getByRole("button", { name: "Connect" })).toHaveCount(0);
    } finally {
      // Clean up so the other tests start without it.
      await prisma!.connectionRequest.deleteMany();
    }
  });

  // Spec scenario: "Own profile"
  test("your own profile shows neither the breakdown nor Connect, and links to your account", async ({
    page,
  }) => {
    await page.goto(await addressOf(member));

    await expect(page.getByTestId("own-profile")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to your account" })).toHaveAttribute(
      "href",
      "/account",
    );
    await expect(page.getByRole("heading", { name: "Why you match" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Connect" })).toHaveCount(0);
  });

  // Spec scenario: "Unknown address"
  test("an address nobody has shows 'page not found'", async ({ page }) => {
    const response = await page.goto("/people/nobody-with-this-name");

    expect(response?.status()).toBe(404);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });

  // Spec scenario: "Suspended person"
  test("a suspended person's address shows 'page not found'", async ({ page }) => {
    const response = await page.goto(await addressOf(suspendedUser));

    expect(response?.status()).toBe(404);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });

  // Spec scenario: "Direct attempt for someone outside the top 5"
  test("the server refuses a hand-sent connect request for someone outside the top 5", async ({
    page,
  }) => {
    const outsider = await getOutsiderAddress(page);

    // page.request sends from the browser's own session, cookie included.
    // `outsider` looks like "/people/the-some-alias", so the route is
    // "/api" + that + "/connect".
    const response = await page.request.post(`/api${outsider}/connect`);
    expect(response.status()).toBe(403);
    expect(await prisma!.connectionRequest.count()).toBe(0);
  });
});

// Spec scenario: "Visitor who is not signed in"
test("signed out, a profile address goes to /signin and shows nothing of the profile", async ({
  page,
}) => {
  const address = await addressOf(member);
  await page.goto("/");
  await signOut(page);

  await page.goto(address);
  await expect(page).toHaveURL(/\/signin/);
});

test("signed in without a finished profile, a profile address goes to /onboarding", async ({
  page,
}) => {
  const address = await addressOf(member);
  await page.goto("/");
  await signInAs(page, notOnboarded);

  await page.goto(address);
  await expect(page).toHaveURL(/\/onboarding/);
});
