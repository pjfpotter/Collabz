// Tests for approving and declining a connection request (slice 5, #12,
// task 4.1), against the test database.
//
// Hand-made people and hand-made requests are used so each expected answer can
// be read straight off the test. The people: anna sends, ben receives, cara
// is a third person who has nothing to do with the request.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  ANSWER_REFUSAL_MESSAGES,
  REQUEST_APPROVED_MESSAGE,
  REQUEST_DECLINED_MESSAGE,
} from "@/lib/requests/messages";
import { answerRequest } from "@/lib/requests/answerRequest";

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

// Makes anna, ben and cara, and one request from anna to ben. Returns the ids.
async function makePendingRequest() {
  const anna = await createPerson(prisma, "anna");
  const ben = await createPerson(prisma, "ben");
  const cara = await createPerson(prisma, "cara");
  const request = await prisma.connectionRequest.create({
    data: { fromUserId: anna, toUserId: ben, status: "PENDING" },
  });
  return { anna, ben, cara, requestId: request.id };
}

async function statusOf(requestId: string) {
  const request = await prisma.connectionRequest.findUniqueOrThrow({ where: { id: requestId } });
  return request.status;
}

describe("answerRequest: approving", () => {
  it("approves, and opens exactly one conversation between the two", async () => {
    const { anna, ben, requestId } = await makePendingRequest();

    const result = await answerRequest(requestId, ben, "approve");

    expect(result).toEqual({ ok: true, status: "APPROVED", message: REQUEST_APPROVED_MESSAGE });
    expect(await statusOf(requestId)).toBe("APPROVED");

    const conversations = await prisma.conversation.findMany();
    expect(conversations).toHaveLength(1);
    // A pair's conversation is stored once, lower id first.
    expect([conversations[0].userAId, conversations[0].userBId].sort()).toEqual(
      [anna, ben].sort(),
    );
    expect(conversations[0].closedAt).toBeNull();
  });

  it("refuses a second approve, and a decline after an approve, keeping the first answer", async () => {
    const { ben, requestId } = await makePendingRequest();
    await answerRequest(requestId, ben, "approve");

    const again = await answerRequest(requestId, ben, "approve");
    const decline = await answerRequest(requestId, ben, "decline");

    expect(again).toEqual({
      ok: false,
      reason: "already-answered",
      message: ANSWER_REFUSAL_MESSAGES["already-answered"],
    });
    expect(decline).toMatchObject({ ok: false, reason: "already-answered" });
    expect(await statusOf(requestId)).toBe("APPROVED");
    expect(await prisma.conversation.count()).toBe(1);
  });

  it("opens only one conversation when two approvals arrive at once", async () => {
    const { ben, requestId } = await makePendingRequest();

    const results = await Promise.all([
      answerRequest(requestId, ben, "approve"),
      answerRequest(requestId, ben, "approve"),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({ reason: "already-answered" });
    expect(await prisma.conversation.count()).toBe(1);
    expect(await statusOf(requestId)).toBe("APPROVED");
  });
});

describe("answerRequest: declining", () => {
  it("declines, and opens no conversation", async () => {
    const { ben, requestId } = await makePendingRequest();

    const result = await answerRequest(requestId, ben, "decline");

    expect(result).toEqual({ ok: true, status: "DECLINED", message: REQUEST_DECLINED_MESSAGE });
    expect(await statusOf(requestId)).toBe("DECLINED");
    expect(await prisma.conversation.count()).toBe(0);
  });

  it("refuses an approve after a decline, and opens no conversation", async () => {
    const { ben, requestId } = await makePendingRequest();
    await answerRequest(requestId, ben, "decline");

    const result = await answerRequest(requestId, ben, "approve");

    expect(result).toMatchObject({ ok: false, reason: "already-answered" });
    expect(await statusOf(requestId)).toBe("DECLINED");
    expect(await prisma.conversation.count()).toBe(0);
  });
});

describe("answerRequest: who may answer", () => {
  it("refuses the sender, and the request stays pending", async () => {
    const { anna, requestId } = await makePendingRequest();

    const result = await answerRequest(requestId, anna, "approve");

    expect(result).toMatchObject({ ok: false, reason: "not-found" });
    expect(await statusOf(requestId)).toBe("PENDING");
    expect(await prisma.conversation.count()).toBe(0);
  });

  it("refuses a third person with the same answer as a request that doesn't exist", async () => {
    const { cara, requestId } = await makePendingRequest();

    const notYours = await answerRequest(requestId, cara, "approve");
    const missing = await answerRequest("no-such-request", cara, "approve");

    // Identical, so nobody can use this to tell which request ids exist.
    expect(notYours).toEqual(missing);
    expect(notYours).toMatchObject({ ok: false, reason: "not-found" });
    expect(await statusOf(requestId)).toBe("PENDING");
  });
});

describe("answerRequest: the sender is no longer allowed", () => {
  it("refuses when the sender has been suspended since", async () => {
    const { anna, requestId, ben } = await makePendingRequest();
    await prisma.user.update({ where: { id: anna }, data: { suspendedAt: new Date() } });

    const result = await answerRequest(requestId, ben, "approve");

    expect(result).toMatchObject({ ok: false, reason: "unavailable" });
    expect(await statusOf(requestId)).toBe("PENDING");
    expect(await prisma.conversation.count()).toBe(0);
  });

  it("refuses when the person asked has blocked the sender", async () => {
    const { anna, ben, requestId } = await makePendingRequest();
    await prisma.block.create({ data: { blockerId: ben, blockedId: anna } });

    const result = await answerRequest(requestId, ben, "approve");

    expect(result).toMatchObject({ ok: false, reason: "unavailable" });
    expect(await statusOf(requestId)).toBe("PENDING");
    expect(await prisma.conversation.count()).toBe(0);
  });

  it("refuses when the sender has blocked the person asked", async () => {
    const { anna, ben, requestId } = await makePendingRequest();
    await prisma.block.create({ data: { blockerId: anna, blockedId: ben } });

    const result = await answerRequest(requestId, ben, "decline");

    expect(result).toMatchObject({ ok: false, reason: "unavailable" });
    expect(await statusOf(requestId)).toBe("PENDING");
  });
});
