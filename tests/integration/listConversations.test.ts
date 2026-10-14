// Tests for listConversations (slice 6, #13, task 4.1), against the test
// database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeConversation, openConversation } from "@/lib/conversations";
import { prisma } from "@/lib/db";
import { listConversations, makePreview } from "@/lib/messages/listConversations";

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

// Stores a message with a chosen time, so ordering is certain and not a race
// between two inserts in the same millisecond.
async function say(conversationId: string, senderId: string, body: string, when: string) {
  await prisma.message.create({
    data: { conversationId, senderId, body, createdAt: new Date(when) },
  });
}

describe("listConversations", () => {
  it("lists only the viewer's conversations, showing the other person", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const cara = await createPerson(prisma, "cara");
    await openConversation(anna, ben);
    await openConversation(ben, cara);

    const forAnna = await listConversations(anna);

    expect(forAnna).toHaveLength(1);
    expect(forAnna[0].alias).toBe("The Test ben");
    expect(forAnna[0].address).toBe("the-test-ben");
    expect(forAnna[0].silhouette).toBe("silhouette-01");

    const forBen = await listConversations(ben);
    expect(forBen.map((c) => c.alias).sort()).toEqual(["The Test anna", "The Test cara"]);
  });

  it("puts the most recent activity first, and a conversation with no messages still appears", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const cara = await createPerson(prisma, "cara");
    const dana = await createPerson(prisma, "dana");
    const withBen = await openConversation(anna, ben);
    const withCara = await openConversation(anna, cara);
    await openConversation(anna, dana); // nothing said

    await say(withBen.id, ben, "older", "2026-10-10T10:00:00Z");
    await say(withCara.id, cara, "newer", "2026-10-12T10:00:00Z");

    const list = await listConversations(anna);

    expect(list.map((c) => c.alias)).toEqual([
      // Opened just now with no messages: newer than both dated messages.
      "The Test dana",
      "The Test cara",
      "The Test ben",
    ]);
    expect(list[0].latestPreview).toBeNull();
    expect(list[0].latestAt).toBeNull();
    expect(list[1].latestPreview).toBe("newer");
  });

  it("shows the latest message's start and marks a closed conversation", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const conversation = await openConversation(anna, ben);
    await say(conversation.id, anna, "first", "2026-10-10T10:00:00Z");
    await say(conversation.id, ben, "x".repeat(200), "2026-10-10T11:00:00Z");
    await closeConversation(conversation.id);

    const [row] = await listConversations(anna);

    expect(row.closed).toBe(true);
    expect(row.latestPreview).toBe(`${"x".repeat(80)}...`);
  });

  it("returns nothing that is an email or another person's user id", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const conversation = await openConversation(anna, ben);
    await say(conversation.id, ben, "hello", "2026-10-10T10:00:00Z");

    const text = JSON.stringify(await listConversations(anna));

    expect(text).not.toContain("@");
    expect(text).not.toContain(ben);
    expect(text).not.toContain(anna);
    // The row's own id is the only id it carries, for the link.
    expect(text).toContain(conversation.id);
  });
});

describe("makePreview", () => {
  it("leaves a short message alone and cuts a long one with '...'", () => {
    expect(makePreview("short")).toBe("short");
    expect(makePreview("a".repeat(80))).toBe("a".repeat(80));
    expect(makePreview("a".repeat(81))).toBe(`${"a".repeat(80)}...`);
  });
});
