// Browser tests for the /requests page, its Approve and Decline buttons and
// the waiting count in the nav bar (slice 5, #12, task 6.4). One test per
// scenario in the connection-requests spec.
//
// These need the pretend cohort and a server with it switched on, so they
// only run locally. Against a deployed site (BASE_URL set) they are skipped.

import { expect, test, type Page } from "@playwright/test";

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
// All three have finished profiles and none is suspended.
const member = "pretend-user-02"; // the tests sign in as them
const sender = "pretend-user-05"; // sends the member a request
const recipient = "pretend-user-06"; // the member sends them a request

test.beforeAll(async () => {
  if (!prisma) return;
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  await loadPretendCohortForTests(prisma);
});

// Every test starts with no requests and no conversations, and builds the
// ones it needs. (The pretend cohort comes with some already, and a request
// the member already has would change what each test sees.)
test.beforeEach(async () => {
  if (!prisma) return;
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.connectionRequest.deleteMany();
});

test.afterAll(async () => {
  await prisma?.$disconnect();
});

// The nav bar's own area, so a test looks for the count there and not
// somewhere else on the page.
const mainNav = (page: Page) => page.getByRole("navigation", { name: "Main" });

async function aliasOf(pretendUserId: string): Promise<string> {
  const profile = await prisma!.profile.findUniqueOrThrow({
    where: { userId: pretendUserId },
    select: { alias: true },
  });
  return profile.alias;
}

test("signed out, /requests sends the visitor to sign in", async ({ page }) => {
  await page.goto("/requests");

  await expect(page).toHaveURL(/\/signin/);
});

test("with nothing waiting and nothing sent, the page says so and the nav shows no count", async ({
  page,
}) => {
  await page.goto("/");
  await signInAs(page, member);
  await page.goto("/requests");

  await expect(page.getByTestId("no-waiting")).toBeVisible();
  await expect(page.getByTestId("no-sent")).toBeVisible();
  await expect(mainNav(page).getByTestId("waiting-count")).toHaveCount(0);
});

// Spec scenario: "Waiting for me" and "Request arrives"
test("a waiting request shows the sender's alias and silhouette with Approve and Decline, and no email", async ({
  page,
}) => {
  await prisma!.connectionRequest.create({
    data: { fromUserId: sender, toUserId: member, status: "PENDING" },
  });

  await page.goto("/");
  await signInAs(page, member);
  await page.goto("/requests");

  const row = page.getByTestId("waiting-list").getByRole("listitem");
  await expect(row).toContainText(await aliasOf(sender));
  await expect(row.locator("svg[data-silhouette]")).toBeVisible();
  await expect(row.getByRole("button", { name: /Approve/ })).toBeVisible();
  await expect(row.getByRole("button", { name: /Decline/ })).toBeVisible();
  // The nav bar's Requests link carries the count, on any page.
  await expect(mainNav(page).getByTestId("waiting-count")).toHaveText(/\(1/);

  // And no email anywhere in the page. (The pretend cohort's emails all end
  // in @collabz.test.)
  expect(await page.content()).not.toContain("@collabz.test");
});

// Spec scenario: "Waiting count"
test("the count is on every page, and shows the number waiting", async ({ page }) => {
  const another = "pretend-user-07";
  await prisma!.connectionRequest.createMany({
    data: [
      { fromUserId: sender, toUserId: member, status: "PENDING" },
      { fromUserId: another, toUserId: member, status: "PENDING" },
    ],
  });

  await page.goto("/");
  await signInAs(page, member);
  // Not the requests page itself: the count must be there on other pages.
  await page.goto("/catalogue");

  await expect(mainNav(page).getByTestId("waiting-count")).toHaveText(/\(2/);
});

// Spec scenario: "Request approved"
test("approving removes the request, drops the count and opens a conversation", async ({
  page,
}) => {
  await prisma!.connectionRequest.create({
    data: { fromUserId: sender, toUserId: member, status: "PENDING" },
  });
  await page.goto("/");
  await signInAs(page, member);
  await page.goto("/requests");

  await page.getByRole("button", { name: /Approve/ }).click();

  // The page refreshes by itself: nothing left waiting, and no count.
  await expect(page.getByTestId("no-waiting")).toBeVisible();
  await expect(mainNav(page).getByTestId("waiting-count")).toHaveCount(0);

  const request = await prisma!.connectionRequest.findFirstOrThrow();
  expect(request.status).toBe("APPROVED");
  expect(await prisma!.conversation.count()).toBe(1);

  // The sender now sees the request as connected.
  await signInAs(page, sender);
  await page.goto("/requests");
  await expect(page.getByTestId("sent-status")).toHaveText("Connected");
});

// Spec scenario: "Request declined"
test("declining removes the request and opens no conversation, and the sender sees Declined", async ({
  page,
}) => {
  await prisma!.connectionRequest.create({
    data: { fromUserId: sender, toUserId: member, status: "PENDING" },
  });
  await page.goto("/");
  await signInAs(page, member);
  await page.goto("/requests");

  await page.getByRole("button", { name: /Decline/ }).click();

  await expect(page.getByTestId("no-waiting")).toBeVisible();
  await expect(mainNav(page).getByTestId("waiting-count")).toHaveCount(0);

  const request = await prisma!.connectionRequest.findFirstOrThrow();
  expect(request.status).toBe("DECLINED");
  expect(await prisma!.conversation.count()).toBe(0);

  await signInAs(page, sender);
  await page.goto("/requests");
  await expect(page.getByTestId("sent-status")).toHaveText("Declined");
});

// Spec scenario: "Sent by me"
test("a request you sent shows the person's alias with the status Waiting", async ({ page }) => {
  await prisma!.connectionRequest.create({
    data: { fromUserId: member, toUserId: recipient, status: "PENDING" },
  });

  await page.goto("/");
  await signInAs(page, member);
  await page.goto("/requests");

  const row = page.getByTestId("sent-list").getByRole("listitem");
  await expect(row).toContainText(await aliasOf(recipient));
  await expect(page.getByTestId("sent-status")).toHaveText("Waiting");
  // Something you sent is not waiting for YOUR answer, so no count.
  await expect(mainNav(page).getByTestId("waiting-count")).toHaveCount(0);
});

// Spec scenario: "Answered twice" - the person who answered in another tab.
test("a request that was answered elsewhere says so instead of failing silently", async ({
  page,
}) => {
  const request = await prisma!.connectionRequest.create({
    data: { fromUserId: sender, toUserId: member, status: "PENDING" },
  });
  await page.goto("/");
  await signInAs(page, member);
  await page.goto("/requests");

  // Answered behind the page's back, as if from another tab, after the page
  // had already been drawn with the buttons.
  await prisma!.connectionRequest.update({
    where: { id: request.id },
    data: { status: "DECLINED" },
  });
  await page.getByRole("button", { name: /Approve/ }).click();

  await expect(page.getByTestId("answer-message")).toHaveText(
    "That request has already been answered.",
  );
  expect(await prisma!.conversation.count()).toBe(0);
});
