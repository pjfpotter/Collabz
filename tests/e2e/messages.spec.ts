// Browser tests for /messages, a conversation page and its send form
// (slice 6, #13, task 5.4). One test per scenario in the messaging spec.
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
const member = "pretend-user-02"; // the tests sign in as them
const friend = "pretend-user-05"; // connected to the member
const stranger = "pretend-user-06"; // not in the member's conversations

test.beforeAll(async () => {
  if (!prisma) return;
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  await loadPretendCohortForTests(prisma);
});

// Every test starts with no requests, conversations or messages, and builds
// the ones it needs. (The pretend cohort comes with some already, and they
// would change what each test sees.)
test.beforeEach(async () => {
  if (!prisma) return;
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.connectionRequest.deleteMany();
});

test.afterAll(async () => {
  await prisma?.$disconnect();
});

async function aliasOf(pretendUserId: string): Promise<string> {
  const profile = await prisma!.profile.findUniqueOrThrow({
    where: { userId: pretendUserId },
    select: { alias: true },
  });
  return profile.alias;
}

// Connects two people (an approved request) and opens their conversation,
// returning the conversation's id.
async function connect(firstUserId: string, secondUserId: string): Promise<string> {
  await prisma!.connectionRequest.create({
    data: { fromUserId: firstUserId, toUserId: secondUserId, status: "APPROVED" },
  });
  // Stored lower id first, as src/lib/userPair.ts does.
  const [userAId, userBId] = [firstUserId, secondUserId].sort();
  const conversation = await prisma!.conversation.create({ data: { userAId, userBId } });
  return conversation.id;
}

test("signed out, /messages sends the visitor to sign in", async ({ page }) => {
  await page.goto("/messages");

  await expect(page).toHaveURL(/\/signin/);
});

test("with no conversations, the page says so", async ({ page }) => {
  await page.goto("/");
  await signInAs(page, member);
  await page.goto("/messages");

  await expect(page.getByTestId("no-conversations")).toBeVisible();
});

test("the list shows the other person and the latest message, and no email", async ({ page }) => {
  const conversationId = await connect(member, friend);
  await prisma!.message.create({
    data: { conversationId, senderId: friend, body: "Fancy a coffee before the pitch night?" },
  });

  await page.goto("/");
  await signInAs(page, member);
  await page.goto("/messages");

  const row = page.getByTestId("conversation-list").getByRole("listitem");
  await expect(row).toContainText(await aliasOf(friend));
  await expect(row).toContainText("Fancy a coffee before the pitch night?");
  await expect(row.locator("svg[data-silhouette]")).toBeVisible();
  expect(await page.content()).not.toContain("@collabz.test");
});

// Spec scenario: "Send and read a message"
test("a sent message appears, and the other person sees it from the sender's alias", async ({
  page,
}) => {
  const conversationId = await connect(member, friend);

  await page.goto("/");
  await signInAs(page, member);
  await page.goto(`/messages/${conversationId}`);
  await page.getByLabel("Your message").fill("Fancy a coffee before the pitch night?");
  await page.getByRole("button", { name: "Send" }).click();

  // The page refreshes by itself: the message is listed, the box is empty.
  const sent = page.getByTestId("message");
  await expect(sent).toContainText("Fancy a coffee before the pitch night?");
  await expect(sent).toContainText("You");
  await expect(page.getByLabel("Your message")).toHaveValue("");

  // The other person, on their next visit, sees it from the member's alias.
  await signInAs(page, friend);
  await page.goto(`/messages/${conversationId}`);
  const received = page.getByTestId("message");
  await expect(received).toContainText("Fancy a coffee before the pitch night?");
  await expect(received).toContainText(await aliasOf(member));
});

test("a message of only spaces is refused with the server's sentence and nothing is stored", async ({
  page,
}) => {
  const conversationId = await connect(member, friend);

  await page.goto("/");
  await signInAs(page, member);
  await page.goto(`/messages/${conversationId}`);
  await page.getByLabel("Your message").fill("     ");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByTestId("send-message")).toHaveText("Write something first, then send it.");
  expect(await prisma!.message.count()).toBe(0);
});

// Spec scenario: "Third party cannot read"
test("someone who isn't in the conversation gets 'page not found'", async ({ page }) => {
  const conversationId = await connect(member, friend);

  await page.goto("/");
  await signInAs(page, stranger);
  const response = await page.goto(`/messages/${conversationId}`);

  expect(response?.status()).toBe(404);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});

// Spec scenario: "Closed conversation refuses messages"
test("a closed conversation can be read but has no form, and the list marks it closed", async ({
  page,
}) => {
  const conversationId = await connect(member, friend);
  await prisma!.message.create({
    data: { conversationId, senderId: friend, body: "Before the block" },
  });
  await prisma!.conversation.update({
    where: { id: conversationId },
    data: { closedAt: new Date() },
  });

  await page.goto("/");
  await signInAs(page, member);
  await page.goto("/messages");
  await expect(page.getByTestId("closed-marker")).toBeVisible();

  await page.goto(`/messages/${conversationId}`);
  await expect(page.getByTestId("message")).toContainText("Before the block");
  await expect(page.getByTestId("closed-notice")).toBeVisible();
  await expect(page.getByLabel("Your message")).toHaveCount(0);
});
