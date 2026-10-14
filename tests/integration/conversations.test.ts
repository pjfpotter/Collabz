// Tests for the two conversation helpers that go beyond the basic contract
// already covered in sharedHelpers.test.ts (slice 6, #13, task 2.1).
//
// WHY ONLY TWO TESTS HERE: sharedHelpers.test.ts already checks that opening
// twice gives one conversation, that a closed conversation comes back closed,
// and that closing twice keeps the first time. These two cover what it doesn't:
// the "two at once" case, and that "never reopens" also means the closing
// time is left alone.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeConversation, openConversation } from "@/lib/conversations";
import { prisma } from "@/lib/db";

import { emptyDatabase } from "../helpers/database";

const annaId = "test-user-anna";
const benId = "test-user-ben";

describe("conversations", () => {
  beforeEach(async () => {
    await emptyDatabase(prisma);
    await prisma.user.create({ data: { id: annaId, email: "anna@conversations-test.test" } });
    await prisma.user.create({ data: { id: benId, email: "ben@conversations-test.test" } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("makes one conversation when two people are opened at the same moment", async () => {
    // Both calls start before either finishes, which is what two approvals
    // arriving together would look like. The database's own "one row per
    // pair" rule must leave exactly one.
    const [first, second] = await Promise.all([
      openConversation(annaId, benId),
      openConversation(benId, annaId),
    ]);

    expect(second.id).toBe(first.id);
    expect(await prisma.conversation.count()).toBe(1);
  });

  it("leaves the closing time alone when a closed conversation is opened again", async () => {
    const conversation = await openConversation(annaId, benId);
    await closeConversation(conversation.id);
    const closedAt = (
      await prisma.conversation.findUniqueOrThrow({ where: { id: conversation.id } })
    ).closedAt;

    const again = await openConversation(benId, annaId);

    expect(again.closedAt).toEqual(closedAt);
    const stored = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
    });
    expect(stored.closedAt).toEqual(closedAt);
  });
});
