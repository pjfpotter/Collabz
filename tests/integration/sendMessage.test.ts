// Tests for sendMessage (slice 6, #13, task 3.2), against the test database.
//
// Each refusal test also checks that NO message row was added: "refused" has
// to mean "nothing stored", not just "said no".

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { openConversation, closeConversation } from "@/lib/conversations";
import { prisma } from "@/lib/db";
import { MESSAGE_MAX_LENGTH, SEND_REFUSAL_MESSAGES } from "@/lib/messages/messages";
import { sendMessage } from "@/lib/messages/sendMessage";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson } from "../helpers/people";

beforeEach(async () => {
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Two people who have an approved connection and an open conversation.
async function makeConnectedPair() {
  const anna = await createPerson(prisma, "anna");
  const ben = await createPerson(prisma, "ben");
  await prisma.connectionRequest.create({
    data: { fromUserId: anna, toUserId: ben, status: "APPROVED" },
  });
  const conversation = await openConversation(anna, ben);
  return { anna, ben, conversationId: conversation.id };
}

async function messageCount(): Promise<number> {
  return prisma.message.count();
}

describe("sendMessage", () => {
  it("stores a message between two connected people, from either side", async () => {
    const { anna, ben, conversationId } = await makeConnectedPair();

    const fromAnna = await sendMessage(anna, conversationId, "Fancy a coffee?");
    const fromBen = await sendMessage(ben, conversationId, "Yes please");

    expect(fromAnna.sent).toBe(true);
    expect(fromBen.sent).toBe(true);
    const stored = await prisma.message.findMany({ orderBy: { createdAt: "asc" } });
    expect(stored.map((m) => [m.senderId, m.body])).toEqual([
      [anna, "Fancy a coffee?"],
      [ben, "Yes please"],
    ]);
  });

  it("trims spaces before storing", async () => {
    const { anna, conversationId } = await makeConnectedPair();

    await sendMessage(anna, conversationId, "   hello   ");

    const stored = await prisma.message.findFirstOrThrow();
    expect(stored.body).toBe("hello");
  });

  it("refuses a stranger, with the same answer as an id that doesn't exist", async () => {
    const { conversationId } = await makeConnectedPair();
    const dana = await createPerson(prisma, "dana");

    const stranger = await sendMessage(dana, conversationId, "hi");
    const madeUp = await sendMessage(dana, "no-such-conversation", "hi");

    expect(stranger).toEqual({
      sent: false,
      reason: "not-found",
      message: SEND_REFUSAL_MESSAGES["not-found"],
    });
    expect(madeUp).toEqual(stranger);
    expect(await messageCount()).toBe(0);
  });

  it("refuses a closed conversation", async () => {
    const { anna, conversationId } = await makeConnectedPair();
    await closeConversation(conversationId);

    const result = await sendMessage(anna, conversationId, "hi");

    expect(result).toMatchObject({ sent: false, reason: "closed" });
    expect(await messageCount()).toBe(0);
  });

  it("refuses two people with no approved request", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const conversation = await openConversation(anna, ben);

    const result = await sendMessage(anna, conversation.id, "hi");

    expect(result).toMatchObject({ sent: false, reason: "not-connected" });
    expect(await messageCount()).toBe(0);
  });

  it("refuses an approved pair once either has blocked the other, in either direction", async () => {
    const { anna, ben, conversationId } = await makeConnectedPair();
    await prisma.block.create({ data: { blockerId: ben, blockedId: anna } });

    const fromBlocked = await sendMessage(anna, conversationId, "hi");
    const fromBlocker = await sendMessage(ben, conversationId, "hi");

    expect(fromBlocked).toMatchObject({ sent: false, reason: "not-connected" });
    expect(fromBlocker).toMatchObject({ sent: false, reason: "not-connected" });
    expect(await messageCount()).toBe(0);
  });

  it("refuses when the other person is suspended", async () => {
    const { anna, ben, conversationId } = await makeConnectedPair();
    await prisma.user.update({ where: { id: ben }, data: { suspendedAt: new Date() } });

    const result = await sendMessage(anna, conversationId, "hi");

    expect(result).toMatchObject({ sent: false, reason: "not-connected" });
    expect(await messageCount()).toBe(0);
  });

  it("refuses an empty message and a spaces-only one", async () => {
    const { anna, conversationId } = await makeConnectedPair();

    const empty = await sendMessage(anna, conversationId, "");
    const spaces = await sendMessage(anna, conversationId, "   \n  ");

    expect(empty).toMatchObject({ sent: false, reason: "empty" });
    expect(spaces).toMatchObject({ sent: false, reason: "empty" });
    expect(await messageCount()).toBe(0);
  });

  it("accepts exactly the limit and refuses one character more", async () => {
    const { anna, conversationId } = await makeConnectedPair();

    const atLimit = await sendMessage(anna, conversationId, "a".repeat(MESSAGE_MAX_LENGTH));
    expect(atLimit.sent).toBe(true);
    expect(await messageCount()).toBe(1);

    const overLimit = await sendMessage(
      anna,
      conversationId,
      "a".repeat(MESSAGE_MAX_LENGTH + 1),
    );
    expect(overLimit).toMatchObject({ sent: false, reason: "too-long" });
    expect(await messageCount()).toBe(1);
  });

  it("says a closed conversation is closed, even after a block (not 'not connected')", async () => {
    // A block both closes the conversation and breaks the connection. The
    // clearer "closed" must win (design decision 3).
    const { anna, ben, conversationId } = await makeConnectedPair();
    await prisma.block.create({ data: { blockerId: ben, blockedId: anna } });
    await closeConversation(conversationId);

    const result = await sendMessage(anna, conversationId, "hi");

    expect(result).toMatchObject({ sent: false, reason: "closed" });
  });
});
