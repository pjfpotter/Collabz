// Tests for what the /requests page and the nav count show (slice 5, #12,
// task 5.1), against the test database.
//
// People: viewer is the one looking. anna, ben and cara are other people.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { getVisiblePeople } from "@/lib/cohort/visiblePeople";
import { prisma } from "@/lib/db";
import { countWaitingRequests, getRequestsPage } from "@/lib/requests/listRequests";
import { isUserVisible } from "@/lib/requests/pairRules";

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

// Stores a request directly, so each test sets the exact state it needs.
async function addRequest(
  fromUserId: string,
  toUserId: string,
  status: "PENDING" | "APPROVED" | "DECLINED" = "PENDING",
  createdAt: Date = new Date(),
) {
  return prisma.connectionRequest.create({
    data: { fromUserId, toUserId, status, createdAt },
  });
}

describe("getRequestsPage: waiting for the viewer", () => {
  it("lists pending requests sent to the viewer, newest first, with only public details", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const older = await addRequest(anna, viewer, "PENDING", new Date("2026-01-01T10:00:00Z"));
    const newer = await addRequest(ben, viewer, "PENDING", new Date("2026-01-02T10:00:00Z"));

    const page = await getRequestsPage(viewer);

    expect(page.waiting.map((request) => request.requestId)).toEqual([newer.id, older.id]);
    expect(page.waiting[0]).toMatchObject({
      requestId: newer.id,
      alias: "The Test ben",
      address: "the-test-ben",
      silhouette: "silhouette-01",
    });
    expect(await countWaitingRequests(viewer)).toBe(2);
  });

  it("does not list answered requests, or requests the viewer sent", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const cara = await createPerson(prisma, "cara");
    await addRequest(anna, viewer, "APPROVED");
    await addRequest(ben, viewer, "DECLINED");
    await addRequest(viewer, cara, "PENDING");

    const page = await getRequestsPage(viewer);

    expect(page.waiting).toEqual([]);
    expect(await countWaitingRequests(viewer)).toBe(0);
  });

  it("leaves out a sender who has been suspended or hasn't finished their profile", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const suspended = await createPerson(prisma, "suspended", { suspended: true });
    const unfinished = await createPerson(prisma, "unfinished", { finishedAt: null });
    await addRequest(suspended, viewer);
    await addRequest(unfinished, viewer);

    const page = await getRequestsPage(viewer);

    expect(page.waiting).toEqual([]);
    expect(await countWaitingRequests(viewer)).toBe(0);
  });

  it("leaves out a sender when either has blocked the other", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const blockedByViewer = await createPerson(prisma, "blockedbyviewer");
    const hasBlockedViewer = await createPerson(prisma, "hasblockedviewer");
    const fine = await createPerson(prisma, "fine");
    await addRequest(blockedByViewer, viewer);
    await addRequest(hasBlockedViewer, viewer);
    await addRequest(fine, viewer);
    await prisma.block.create({ data: { blockerId: viewer, blockedId: blockedByViewer } });
    await prisma.block.create({ data: { blockerId: hasBlockedViewer, blockedId: viewer } });

    const page = await getRequestsPage(viewer);

    expect(page.waiting.map((request) => request.alias)).toEqual(["The Test fine"]);
    expect(await countWaitingRequests(viewer)).toBe(1);
  });

  it("always counts exactly the number of requests it lists", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const people = [];
    for (const name of ["a", "b", "c"]) {
      people.push(await createPerson(prisma, name));
    }
    const suspended = await createPerson(prisma, "gone", { suspended: true });
    for (const person of people) await addRequest(person, viewer);
    await addRequest(suspended, viewer);

    const page = await getRequestsPage(viewer);

    expect(page.waiting).toHaveLength(3);
    expect(await countWaitingRequests(viewer)).toBe(page.waiting.length);
  });
});

describe("getRequestsPage: sent by the viewer", () => {
  it("shows each sent request with waiting, connected or declined", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    const cara = await createPerson(prisma, "cara");
    await addRequest(viewer, anna, "PENDING");
    await addRequest(viewer, ben, "APPROVED");
    await addRequest(viewer, cara, "DECLINED");

    const page = await getRequestsPage(viewer);

    const statusByAlias = Object.fromEntries(
      page.sent.map((request) => [request.alias, request.status]),
    );
    expect(statusByAlias).toEqual({
      "The Test anna": "waiting",
      "The Test ben": "connected",
      "The Test cara": "declined",
    });
  });

  it("leaves out a person who has since been suspended, or a blocked pair", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const suspended = await createPerson(prisma, "suspended", { suspended: true });
    const blocker = await createPerson(prisma, "blocker");
    const fine = await createPerson(prisma, "fine");
    await addRequest(viewer, suspended);
    await addRequest(viewer, blocker);
    await addRequest(viewer, fine);
    await prisma.block.create({ data: { blockerId: blocker, blockedId: viewer } });

    const page = await getRequestsPage(viewer);

    expect(page.sent.map((request) => request.alias)).toEqual(["The Test fine"]);
  });
});

describe("getRequestsPage: what is exposed", () => {
  it("contains no email and no user id anywhere in the result", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await addRequest(anna, viewer);
    await addRequest(viewer, ben);

    const page = await getRequestsPage(viewer);
    const text = JSON.stringify(page);

    // createPerson makes emails like "anna@cohort-test.test" and ids like
    // "test-user-anna". Neither may appear in what the page is given.
    expect(text).not.toContain("@");
    expect(text).not.toContain("test-user-");
  });
});

describe("isUserVisible agrees with getVisiblePeople", () => {
  it("says the same for a finished, an unfinished and a suspended person", async () => {
    const finished = await createPerson(prisma, "finished");
    const unfinished = await createPerson(prisma, "unfinished", { finishedAt: null });
    const suspended = await createPerson(prisma, "suspended", { suspended: true });

    const visibleIds = new Set((await getVisiblePeople()).map((person) => person.userId));

    for (const userId of [finished, unfinished, suspended]) {
      expect(await isUserVisible(userId)).toBe(visibleIds.has(userId));
    }
    // And the answers are the ones the rule intends, not just equal.
    expect(await isUserVisible(finished)).toBe(true);
    expect(await isUserVisible(unfinished)).toBe(false);
    expect(await isUserVisible(suspended)).toBe(false);
  });
});

// Regression: an accepted incoming request used to vanish from both lists.
describe("getRequestsPage: accepted connections", () => {
  it("shows the same accepted pair to sender and recipient", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await addRequest(anna, ben, "APPROVED");
    expect((await getRequestsPage(anna)).connected.map(p => p.alias)).toEqual(["The Test ben"]);
    const recipient = await getRequestsPage(ben);
    expect(recipient.connected.map(p => p.alias)).toEqual(["The Test anna"]);
    expect(recipient.waiting).toEqual([]);
    expect(recipient.sent).toEqual([]);
    expect(await countWaitingRequests(ben)).toBe(0);
    expect(JSON.stringify(recipient.connected)).not.toContain("test-user-");
    expect(JSON.stringify(recipient.connected)).not.toContain("@");
  });

  it("does not turn pending or declined requests into connections", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await addRequest(anna, viewer, "PENDING");
    await addRequest(viewer, ben, "DECLINED");
    expect((await getRequestsPage(viewer)).connected).toEqual([]);
    expect(await countWaitingRequests(viewer)).toBe(1);
  });

  it("hides blocked, suspended and unfinished people in either direction", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const suspended = await createPerson(prisma, "suspended", { suspended: true });
    const unfinished = await createPerson(prisma, "unfinished", { finishedAt: null });
    const blocked = await createPerson(prisma, "blocked");
    const blocker = await createPerson(prisma, "blocker");
    await addRequest(suspended, viewer, "APPROVED");
    await addRequest(viewer, unfinished, "APPROVED");
    await addRequest(blocked, viewer, "APPROVED");
    await addRequest(viewer, blocker, "APPROVED");
    await prisma.block.create({ data: { blockerId: viewer, blockedId: blocked } });
    await prisma.block.create({ data: { blockerId: blocker, blockedId: viewer } });
    expect((await getRequestsPage(viewer)).connected).toEqual([]);
  });

  it("shows one person when legacy data contains reverse duplicate approvals", async () => {
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await addRequest(anna, ben, "APPROVED");
    await addRequest(ben, anna, "APPROVED");
    expect((await getRequestsPage(anna)).connected).toHaveLength(1);
    expect((await getRequestsPage(ben)).connected).toHaveLength(1);
  });
});
