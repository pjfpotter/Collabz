// Tests for POST /api/messages/[conversationId] (slice 6, #13, task 3.3):
// 401, 404, 409, 422 and 200, against the test database.
//
// The rules themselves are tested in sendMessage.test.ts. These tests check
// that the route is wired to them and answers with the right status.

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/messages/[conversationId]/route";
import { closeConversation, openConversation } from "@/lib/conversations";
import { prisma } from "@/lib/db";
import { SEND_REFUSAL_MESSAGES } from "@/lib/messages/messages";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson } from "../helpers/people";

// The route asks getCurrentUser() who is signed in. The real one reads a
// browser cookie, which doesn't exist in a plain test, so the tests replace it
// with a stand-in that returns whoever `signedInAs.user` is set to.
const signedInAs: { user: { id: string } | null } = { user: null };
vi.mock("@/lib/currentUser", () => ({
  getCurrentUser: async () => signedInAs.user,
}));

beforeEach(async () => {
  signedInAs.user = null;
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Calls the route the way Next.js would. `params` is a Promise in this
// version of Next.js, hence Promise.resolve. `rawBody` is sent as it is, so a
// test can send something that isn't JSON.
async function call(conversationId: string, rawBody: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/messages/x", { method: "POST", body: rawBody }),
    { params: Promise.resolve({ conversationId }) } as Parameters<typeof POST>[1],
  );
}

function jsonBody(text: string): string {
  return JSON.stringify({ body: text });
}

async function makeConnectedPair() {
  const anna = await createPerson(prisma, "anna");
  const ben = await createPerson(prisma, "ben");
  await prisma.connectionRequest.create({
    data: { fromUserId: anna, toUserId: ben, status: "APPROVED" },
  });
  const conversation = await openConversation(anna, ben);
  return { anna, ben, conversationId: conversation.id };
}

describe("POST /api/messages/[conversationId]", () => {
  it("answers 401 when nobody is signed in, and stores nothing", async () => {
    const { conversationId } = await makeConnectedPair();

    const response = await call(conversationId, jsonBody("hi"));

    expect(response.status).toBe(401);
    expect(await prisma.message.count()).toBe(0);
  });

  it("answers 200 and stores the message for a participant", async () => {
    const { anna, conversationId } = await makeConnectedPair();
    signedInAs.user = { id: anna };

    const response = await call(conversationId, jsonBody("Fancy a coffee?"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    const stored = await prisma.message.findFirstOrThrow();
    expect(stored.body).toBe("Fancy a coffee?");
    expect(stored.senderId).toBe(anna);
  });

  it("answers 404 for a third person and for an id that doesn't exist", async () => {
    const { conversationId } = await makeConnectedPair();
    const dana = await createPerson(prisma, "dana");
    signedInAs.user = { id: dana };

    const stranger = await call(conversationId, jsonBody("hi"));
    const madeUp = await call("no-such-conversation", jsonBody("hi"));

    expect(stranger.status).toBe(404);
    expect(madeUp.status).toBe(404);
    expect(await prisma.message.count()).toBe(0);
  });

  it("answers 409 for a closed conversation, with the closed sentence", async () => {
    const { anna, conversationId } = await makeConnectedPair();
    await closeConversation(conversationId);
    signedInAs.user = { id: anna };

    const response = await call(conversationId, jsonBody("hi"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      message: SEND_REFUSAL_MESSAGES.closed,
    });
    expect(await prisma.message.count()).toBe(0);
  });

  it("answers 409 when the two are no longer connected", async () => {
    const { anna, ben, conversationId } = await makeConnectedPair();
    await prisma.block.create({ data: { blockerId: ben, blockedId: anna } });
    signedInAs.user = { id: anna };

    const response = await call(conversationId, jsonBody("hi"));

    expect(response.status).toBe(409);
    expect(await prisma.message.count()).toBe(0);
  });

  it("answers 422 for an empty message and a too-long one", async () => {
    const { anna, conversationId } = await makeConnectedPair();
    signedInAs.user = { id: anna };

    const empty = await call(conversationId, jsonBody("  "));
    const tooLong = await call(conversationId, jsonBody("a".repeat(1001)));

    expect(empty.status).toBe(422);
    expect(tooLong.status).toBe(422);
    expect(await prisma.message.count()).toBe(0);
  });

  it("treats a body that isn't valid JSON, or has no text, as an empty message", async () => {
    const { anna, conversationId } = await makeConnectedPair();
    signedInAs.user = { id: anna };

    const notJson = await call(conversationId, "this is not json");
    const noText = await call(conversationId, JSON.stringify({ body: 42 }));

    expect(notJson.status).toBe(422);
    expect(noText.status).toBe(422);
    expect(await prisma.message.count()).toBe(0);
  });
});
