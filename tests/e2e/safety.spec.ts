// Browser tests for safety (slice 9, #16, task 5.1).
//
// Success checks from #16 covered here:
//   - non-admins can't see the queue,
//   - admins see open reports and can resolve one,
//   - a report needs a reason from the list and reaches the queue,
//   - after a block the person is gone and the conversation is closed.
//
// Like admin.spec.ts it needs the pretend cohort, so it only runs locally.

import { expect, test } from "@playwright/test";

import { seedCatalogue } from "../../prisma/seed";
import {
  createTestDatabaseClient,
  emptyDatabase,
  loadPretendCohortForTests,
} from "../helpers/database";
import { aliasToAddress } from "../../src/lib/cohort/aliasAddress";
import { signInAs } from "../helpers/devSignIn";

const testingDeployedSite = Boolean(process.env.BASE_URL);
test.skip(testingDeployedSite, "Needs the pretend cohort, so only runs against the test database");

const prisma = testingDeployedSite ? null : createTestDatabaseClient();

const admin = "pretend-user-01";
const member = "pretend-user-02";
const reportedPerson = "pretend-user-08";
const blockedFriend = "pretend-user-05";

// The page address of a pretend person, from their alias.
async function addressOf(pretendUserId: string): Promise<{ alias: string; address: string }> {
  const profile = await prisma!.profile.findUniqueOrThrow({
    where: { userId: pretendUserId },
    select: { alias: true },
  });
  return { alias: profile.alias, address: aliasToAddress(profile.alias) };
}

test.beforeAll(async () => {
  if (!prisma) return;
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  await loadPretendCohortForTests(prisma);
});

test.afterAll(async () => {
  // The whole database is put back after the run (playwrightGlobalTeardown).
  await prisma?.$disconnect();
});

test.describe("who can open the moderation queue", () => {
  test("a signed-out visitor is sent to sign in", async ({ page }) => {
    await page.goto("/");
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("a member sees 'page not found'", async ({ page }) => {
    await page.goto("/");
    await signInAs(page, member);

    const response = await page.goto("/admin/reports");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toHaveCount(0);
  });
});

test.describe("the queue, as an admin", () => {
  test("shows the pretend cohort's open report with its three actions, and Resolve moves it", async ({
    page,
  }) => {
    await page.goto("/");
    await signInAs(page, admin);
    await page.goto("/admin/reports");

    await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
    const openCards = page.getByTestId("open-reports").getByTestId("report-card");
    await expect(openCards).toHaveCount(1);
    await expect(openCards.first()).toContainText("Inappropriate messages");
    await expect(openCards.first().getByRole("button", { name: "Resolve" })).toBeVisible();
    await expect(openCards.first().getByRole("button", { name: "Suspend" })).toBeVisible();

    await openCards.first().getByRole("button", { name: "Resolve" }).click();

    await expect(page.getByTestId("no-open-reports")).toBeVisible();
    await expect(
      page.getByTestId("resolved-reports").getByTestId("report-card"),
    ).toHaveCount(1);
  });
});

test.describe("a member's Report and Block buttons", () => {
  test("a report needs a reason from the list, then reaches the queue", async ({ page }) => {
    const { alias, address } = await addressOf(reportedPerson);
    await page.goto("/");
    await signInAs(page, member);
    await page.goto(`/people/${address}`);

    await page.getByText("Report or block").click();
    // No reason picked yet.
    await page.getByRole("button", { name: "Send report" }).click();
    await expect(page.getByTestId("report-message")).toHaveText("Choose a reason from the list.");

    await page.getByLabel("Harassment or bullying").check();
    await page.getByRole("button", { name: "Send report" }).click();
    await expect(page.getByTestId("report-message")).toContainText("Thank you");

    // The admin sees it, with the reason.
    await signInAs(page, admin);
    await page.goto("/admin/reports");
    const card = page
      .getByTestId("open-reports")
      .getByTestId("report-card")
      .filter({ hasText: alias });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Harassment or bullying");
  });

  test("blocking from a conversation closes it and removes the person from the lists", async ({
    page,
  }) => {
    const { alias, address } = await addressOf(blockedFriend);
    // A connected pair with a conversation, made directly.
    await prisma!.connectionRequest.deleteMany({
      where: { OR: [{ fromUserId: member, toUserId: blockedFriend }, { fromUserId: blockedFriend, toUserId: member }] },
    });
    await prisma!.connectionRequest.create({
      data: { fromUserId: member, toUserId: blockedFriend, status: "APPROVED" },
    });
    const [userAId, userBId] = [member, blockedFriend].sort();
    const conversation = await prisma!.conversation.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: { closedAt: null },
      create: { userAId, userBId },
    });

    await page.goto("/");
    await signInAs(page, member);
    await page.goto(`/messages/${conversation.id}`);
    await page.getByText("Report or block").click();
    await page.getByRole("button", { name: "Block", exact: true }).click();
    await page.getByRole("button", { name: `Yes, block ${alias}` }).click();

    // They are sent to the people list, where the blocked person is gone.
    await expect(page).toHaveURL(/\/people$/);
    await expect(page.getByRole("link", { name: alias })).toHaveCount(0);
    expect((await prisma!.block.count({ where: { blockerId: member, blockedId: blockedFriend } }))).toBe(1);

    // The conversation is closed for both.
    const closed = await prisma!.conversation.findUniqueOrThrow({ where: { id: conversation.id } });
    expect(closed.closedAt).not.toBeNull();
    // Their profile page is gone for the blocked person too.
    await signInAs(page, blockedFriend);
    const memberAddress = (await addressOf(member)).address;
    const response = await page.goto(`/people/${memberAddress}`);
    expect(response?.status()).toBe(404);
    // And the page of the person who blocked them is gone for the blocker.
    await signInAs(page, member);
    expect((await page.goto(`/people/${address}`))?.status()).toBe(404);
  });
});
