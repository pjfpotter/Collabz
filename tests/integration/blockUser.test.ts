// Tests for blocking a person (slice 9, #16, task 1.2), against the test
// database. anna blocks ben in most of these.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { canSeePhoto } from "@/lib/account/photoRules";
import { closeConversation, openConversation } from "@/lib/conversations";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/messages/sendMessage";
import { sendConnectionRequest } from "@/lib/requests/sendRequest";
import { blockUser } from "@/lib/safety/blockUser";

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

// Two people with an approved request and an open conversation.
async function makeConnectedPair() {
  const anna = await createPerson(prisma, "anna");
  const ben = await createPerson(prisma, "ben");
  await prisma.connectionRequest.create({
    data: { fromUserId: anna, toUserId: ben, status: "APPROVED" },
  });
  const conversation = await openConversation(anna, ben);
  return { anna, ben, conversationId: conversation.id };
}

describe("blockUser", () => {
  it("stores the block, and nothing else changes for a pair with no conversation", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");

    expect(await blockUser(anna, ben)).toEqual([]);

    const blocks = await prisma.block.findMany();
    expect(blocks.map((b) => [b.blockerId, b.blockedId])).toEqual([[anna, ben]]);
  });

  it("refuses to block yourself and stores nothing", async () => {
    const anna = await createPerson(prisma, "anna");

    const problems = await blockUser(anna, anna);

    expect(problems).toEqual(["You can't block yourself."]);
    expect(await prisma.block.count()).toBe(0);
  });

  it("refuses a person who doesn't exist", async () => {
    const anna = await createPerson(prisma, "anna");

    const problems = await blockUser(anna, "test-user-nobody");

    expect(problems).toHaveLength(1);
    expect(await prisma.block.count()).toBe(0);
  });

  it("is fine to block the same person twice", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");

    expect(await blockUser(anna, ben)).toEqual([]);
    expect(await blockUser(anna, ben)).toEqual([]);

    expect(await prisma.block.count()).toBe(1);
  });

  it("closes an existing conversation, and sendMessage then refuses from both sides", async () => {
    const { anna, ben, conversationId } = await makeConnectedPair();

    await blockUser(anna, ben);

    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    expect(conversation.closedAt).not.toBeNull();
    expect((await sendMessage(anna, conversationId, "hello")).sent).toBe(false);
    expect((await sendMessage(ben, conversationId, "hello")).sent).toBe(false);
    expect(await prisma.message.count()).toBe(0);
  });

  it("keeps the original closing time of an already-closed conversation", async () => {
    const { anna, ben, conversationId } = await makeConnectedPair();
    await closeConversation(conversationId);
    const before = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });

    await blockUser(anna, ben);

    const after = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
    expect(after.closedAt).toEqual(before.closedAt);
  });

  it("does not create a conversation when the pair never had one", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");

    await blockUser(anna, ben);

    expect(await prisma.conversation.count()).toBe(0);
  });

  it("hides the photo from each of them (from the blocker and the blocked)", async () => {
    const { anna, ben } = await makeConnectedPair();
    const asViewer = (id: string) =>
      prisma.user.findUniqueOrThrow({ where: { id }, select: { id: true, role: true } });
    // Before the block, connected people can see each other's photo.
    expect(await canSeePhoto(await asViewer(anna), ben)).toBe(true);

    await blockUser(anna, ben);

    expect(await canSeePhoto(await asViewer(anna), ben)).toBe(false);
    expect(await canSeePhoto(await asViewer(ben), anna)).toBe(false);
  });

  it("stops either person sending the other a connection request", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await blockUser(anna, ben);

    const fromAnna = await sendConnectionRequest(anna, ben);
    const fromBen = await sendConnectionRequest(ben, anna);

    expect(fromAnna.sent).toBe(false);
    expect(fromBen.sent).toBe(false);
    expect(await prisma.connectionRequest.count()).toBe(0);
  });
});
