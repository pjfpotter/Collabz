// Tests for getConversation (slice 6, #13, task 4.2), against the test
// database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeConversation, openConversation } from "@/lib/conversations";
import { prisma } from "@/lib/db";
import { getConversation } from "@/lib/messages/getConversation";

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

async function makeConversation() {
  const anna = await createPerson(prisma, "anna");
  const ben = await createPerson(prisma, "ben");
  const conversation = await openConversation(anna, ben);
  // Two messages with set times, written out of order on purpose so the test
  // shows the page sorts them, not the insert order.
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: ben,
      body: "second",
      createdAt: new Date("2026-10-10T11:00:00Z"),
    },
  });
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: anna,
      body: "first",
      createdAt: new Date("2026-10-10T10:00:00Z"),
    },
  });
  return { anna, ben, conversationId: conversation.id };
}

describe("getConversation", () => {
  it("lets both people read it, oldest first, with their own messages marked", async () => {
    const { anna, ben, conversationId } = await makeConversation();

    const asAnna = await getConversation(anna, conversationId);
    const asBen = await getConversation(ben, conversationId);

    expect(asAnna?.alias).toBe("The Test ben");
    expect(asAnna?.messages.map((m) => [m.body, m.mine, m.senderAlias])).toEqual([
      ["first", true, "The Test anna"],
      ["second", false, "The Test ben"],
    ]);
    expect(asBen?.alias).toBe("The Test anna");
    expect(asBen?.messages.map((m) => m.mine)).toEqual([false, true]);
  });

  it("returns null for a third person and for an id that doesn't exist", async () => {
    const { conversationId } = await makeConversation();
    const dana = await createPerson(prisma, "dana");

    expect(await getConversation(dana, conversationId)).toBeNull();
    expect(await getConversation(dana, "no-such-conversation")).toBeNull();
  });

  it("still lets a closed conversation be read", async () => {
    const { anna, conversationId } = await makeConversation();
    await closeConversation(conversationId);

    const view = await getConversation(anna, conversationId);

    expect(view?.closed).toBe(true);
    expect(view?.messages).toHaveLength(2);
  });

  it("returns no email and no user id", async () => {
    const { anna, ben, conversationId } = await makeConversation();

    const text = JSON.stringify(await getConversation(anna, conversationId));

    expect(text).not.toContain("@");
    expect(text).not.toContain(anna);
    expect(text).not.toContain(ben);
  });
});
