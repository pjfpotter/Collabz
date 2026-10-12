// Tests for sending a connection request (slice 5, #12, tasks 2.1 to 2.3),
// against the test database.
//
// Hand-made people (tests/helpers/people.ts) are used so every expected
// answer can be read straight off the test, and so the pretend cohort's
// requests don't get in the way.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { REFUSAL_MESSAGES, REQUEST_SENT_MESSAGE } from "@/lib/requests/messages";
import {
  insertRequestUnlessPairHasOne,
  sendConnectionRequest,
} from "@/lib/requests/sendRequest";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson, createScore } from "../helpers/people";

beforeEach(async () => {
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("insertRequestUnlessPairHasOne", () => {
  it("stores one pending request when the pair has none", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");

    const outcome = await insertRequestUnlessPairHasOne(anna, ben);

    expect(outcome).toBe("created");
    const rows = await prisma.connectionRequest.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ fromUserId: anna, toUserId: ben, status: "PENDING" });
  });

  it("stores nothing when the pair already has a request, either way round", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await insertRequestUnlessPairHasOne(anna, ben);

    expect(await insertRequestUnlessPairHasOne(anna, ben)).toBe("exists");
    expect(await insertRequestUnlessPairHasOne(ben, anna)).toBe("exists");

    expect(await prisma.connectionRequest.count()).toBe(1);
  });

  it("stores exactly one request when the same press arrives twice at once", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");

    // Promise.all starts both at the same moment and waits for both. This is
    // the "two presses of Connect at once" case the transaction exists for.
    const outcomes = await Promise.all([
      insertRequestUnlessPairHasOne(anna, ben),
      insertRequestUnlessPairHasOne(anna, ben),
    ]);

    expect(outcomes.filter((outcome) => outcome === "created")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome === "exists")).toHaveLength(1);
    expect(await prisma.connectionRequest.count()).toBe(1);
  });

  it("stores exactly one request when each asks the other at once", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");

    // The reverse direction is the case a unique rule on (from, to) would
    // have missed.
    const outcomes = await Promise.all([
      insertRequestUnlessPairHasOne(anna, ben),
      insertRequestUnlessPairHasOne(ben, anna),
    ]);

    expect(outcomes.filter((outcome) => outcome === "created")).toHaveLength(1);
    expect(await prisma.connectionRequest.count()).toBe(1);
  });
});

// Makes the viewer, anna (score 9, in the top 5) and ben (score 1, outside
// it), plus five fillers with scores 8 to 4 that push ben out. Returns their
// ids. The same set-up slice 4's profile tests use.
async function makeViewerWithTopFiveAndOutsider() {
  const viewer = await createPerson(prisma, "viewer");
  const anna = await createPerson(prisma, "anna");
  const ben = await createPerson(prisma, "ben");

  await createScore(prisma, viewer, anna, 9);
  await createScore(prisma, viewer, ben, 1);
  for (const [index, score] of [8, 7, 6, 5, 4].entries()) {
    const filler = await createPerson(prisma, `filler${index}`);
    await createScore(prisma, viewer, filler, score);
  }
  return { viewer, anna, ben };
}

describe("sendConnectionRequest", () => {
  it("stores one pending request for someone in the top 5", async () => {
    const { viewer, anna } = await makeViewerWithTopFiveAndOutsider();

    const result = await sendConnectionRequest(viewer, anna);

    expect(result).toEqual({ sent: true, message: REQUEST_SENT_MESSAGE });
    const rows = await prisma.connectionRequest.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ fromUserId: viewer, toUserId: anna, status: "PENDING" });
  });

  it("stores one pending request for the glitch match, even outside the top 5", async () => {
    const { viewer, ben } = await makeViewerWithTopFiveAndOutsider();
    await prisma.glitchMatch.create({ data: { userId: viewer, matchedUserId: ben } });

    const result = await sendConnectionRequest(viewer, ben);

    expect(result.sent).toBe(true);
    expect(await prisma.connectionRequest.count()).toBe(1);
  });

  it("refuses someone outside the top 5 and not the glitch match", async () => {
    const { viewer, ben } = await makeViewerWithTopFiveAndOutsider();

    const result = await sendConnectionRequest(viewer, ben);

    expect(result).toEqual({
      sent: false,
      message: REFUSAL_MESSAGES["not-a-match"],
      reason: "not-a-match",
    });
    expect(await prisma.connectionRequest.count()).toBe(0);
  });

  it("refuses yourself", async () => {
    const { viewer } = await makeViewerWithTopFiveAndOutsider();

    const result = await sendConnectionRequest(viewer, viewer);

    expect(result).toMatchObject({ sent: false, reason: "self" });
    expect(await prisma.connectionRequest.count()).toBe(0);
  });

  it("refuses a suspended person, even one in the top 5", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const gone = await createPerson(prisma, "gone", { suspended: true });
    await createScore(prisma, viewer, gone, 9);

    const result = await sendConnectionRequest(viewer, gone);

    expect(result).toMatchObject({ sent: false, reason: "unavailable" });
    expect(await prisma.connectionRequest.count()).toBe(0);
  });

  it("refuses someone who has not finished their profile", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const unfinished = await createPerson(prisma, "unfinished", { finishedAt: null });
    await createScore(prisma, viewer, unfinished, 9);

    const result = await sendConnectionRequest(viewer, unfinished);

    expect(result).toMatchObject({ sent: false, reason: "unavailable" });
    expect(await prisma.connectionRequest.count()).toBe(0);
  });

  it("refuses when the sender has blocked the person", async () => {
    const { viewer, anna } = await makeViewerWithTopFiveAndOutsider();
    await prisma.block.create({ data: { blockerId: viewer, blockedId: anna } });

    const result = await sendConnectionRequest(viewer, anna);

    expect(result).toMatchObject({ sent: false, reason: "unavailable" });
    expect(await prisma.connectionRequest.count()).toBe(0);
  });

  it("refuses when the person has blocked the sender, with the same answer", async () => {
    const { viewer, anna } = await makeViewerWithTopFiveAndOutsider();
    await prisma.block.create({ data: { blockerId: anna, blockedId: viewer } });

    const result = await sendConnectionRequest(viewer, anna);

    // Same reason and same sentence as the case above: the sender can't tell
    // who blocked whom.
    expect(result).toEqual({
      sent: false,
      message: REFUSAL_MESSAGES.unavailable,
      reason: "unavailable",
    });
    expect(await prisma.connectionRequest.count()).toBe(0);
  });

  it("refuses when the sender already has a pending request to them", async () => {
    const { viewer, anna } = await makeViewerWithTopFiveAndOutsider();
    await sendConnectionRequest(viewer, anna);

    const result = await sendConnectionRequest(viewer, anna);

    expect(result).toMatchObject({ sent: false, reason: "already-pending" });
    expect(await prisma.connectionRequest.count()).toBe(1);
  });

  it("refuses when the person already has a pending request to the sender", async () => {
    const { viewer, anna } = await makeViewerWithTopFiveAndOutsider();
    await prisma.connectionRequest.create({
      data: { fromUserId: anna, toUserId: viewer, status: "PENDING" },
    });

    const result = await sendConnectionRequest(viewer, anna);

    expect(result).toMatchObject({ sent: false, reason: "already-pending" });
    expect(await prisma.connectionRequest.count()).toBe(1);
  });

  it("refuses when they are already connected, either way round", async () => {
    const { viewer, anna } = await makeViewerWithTopFiveAndOutsider();
    await prisma.connectionRequest.create({
      data: { fromUserId: anna, toUserId: viewer, status: "APPROVED" },
    });

    const result = await sendConnectionRequest(viewer, anna);

    expect(result).toMatchObject({ sent: false, reason: "already-connected" });
    expect(await prisma.connectionRequest.count()).toBe(1);
  });

  it("refuses after a decline, whichever of the two sends again", async () => {
    const { viewer, anna } = await makeViewerWithTopFiveAndOutsider();
    // anna asked the viewer and the viewer declined.
    await prisma.connectionRequest.create({
      data: { fromUserId: anna, toUserId: viewer, status: "DECLINED" },
    });

    // The viewer, who declined, can't ask back...
    expect(await sendConnectionRequest(viewer, anna)).toMatchObject({
      sent: false,
      reason: "declined",
    });
    // ...and neither can anna ask again. (A pair's score is stored once, so
    // the viewer is already in anna's top 5, and the decline must still win.)
    expect(await sendConnectionRequest(anna, viewer)).toMatchObject({
      sent: false,
      reason: "declined",
    });

    expect(await prisma.connectionRequest.count()).toBe(1);
  });

  it("says a request is waiting even when the person has dropped out of the top 5", async () => {
    // The order of the checks: an existing request is reported before the
    // top 5 rule is looked at.
    const { viewer, ben } = await makeViewerWithTopFiveAndOutsider();
    await prisma.connectionRequest.create({
      data: { fromUserId: viewer, toUserId: ben, status: "PENDING" },
    });

    const result = await sendConnectionRequest(viewer, ben);

    expect(result).toMatchObject({ sent: false, reason: "already-pending" });
  });

  it("stores one request when the same press arrives twice at once", async () => {
    const { viewer, anna } = await makeViewerWithTopFiveAndOutsider();

    const results = await Promise.all([
      sendConnectionRequest(viewer, anna),
      sendConnectionRequest(viewer, anna),
    ]);

    expect(results.filter((result) => result.sent)).toHaveLength(1);
    // The one that lost is told a request is already waiting, not given a
    // vague failure.
    const loser = results.find((result) => !result.sent);
    expect(loser).toMatchObject({ reason: "already-pending" });
    expect(await prisma.connectionRequest.count()).toBe(1);
  });
});
