// Tests for the profile page's logic and the Connect route (slice 4, #11,
// tasks 6.1 to 6.3), against the test database.
//
// Hand-made people (tests/helpers/people.ts) are used so every expected
// answer can be read straight off the test. The people in these tests
// (see makeViewerWithTopFiveAndOutsider below):
//
//   viewer  - the one looking
//   anna    - score 9 with viewer: in the top 5
//   ben     - score 1 with viewer: outside the top 5
//   filler0 to filler4 - scores 8, 7, 6, 5 and 4 with viewer
//
// So the viewer's top 5 is anna and filler0 to filler3, and both filler4 and
// ben are outside it. The tests only rely on anna being IN and ben being OUT.

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/people/[alias]/connect/route";
import {
  findRequestStatus,
  getConnectPermission,
  getProfileLookup,
} from "@/lib/cohort/profile";
import { REQUESTS_NOT_SWITCHED_ON_MESSAGE } from "@/lib/cohort/standIns";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson, createScore } from "../helpers/people";

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

// Makes the viewer, anna (in the top 5) and ben (outside it), and returns
// their ids. Five filler people with middling scores fill the other four top
// 5 places, which is what pushes ben out.
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

describe("getConnectPermission", () => {
  it("allows someone in the top 5", async () => {
    const { viewer, anna } = await makeViewerWithTopFiveAndOutsider();
    expect(await getConnectPermission(viewer, anna)).toBe("top-five");
  });

  it("refuses someone outside the top 5 and not the glitch match", async () => {
    const { viewer, ben } = await makeViewerWithTopFiveAndOutsider();
    expect(await getConnectPermission(viewer, ben)).toBeNull();
  });

  it("allows the glitch match, even outside the top 5, and says so", async () => {
    const { viewer, ben } = await makeViewerWithTopFiveAndOutsider();
    await prisma.glitchMatch.create({ data: { userId: viewer, matchedUserId: ben } });
    expect(await getConnectPermission(viewer, ben)).toBe("glitch");
  });

  it("refuses a glitch match who has since been suspended", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const gone = await createPerson(prisma, "gone", { suspended: true });
    await prisma.glitchMatch.create({ data: { userId: viewer, matchedUserId: gone } });
    expect(await getConnectPermission(viewer, gone)).toBeNull();
  });

  it("refuses connecting with yourself", async () => {
    const { viewer } = await makeViewerWithTopFiveAndOutsider();
    expect(await getConnectPermission(viewer, viewer)).toBeNull();
  });
});

describe("findRequestStatus", () => {
  it("returns null when there is no request", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    expect(await findRequestStatus(viewer, anna)).toBeNull();
  });

  it("finds a pending request sent in either direction", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    await prisma.connectionRequest.create({
      data: { fromUserId: anna, toUserId: viewer, status: "PENDING" },
    });
    expect(await findRequestStatus(viewer, anna)).toBe("PENDING");
    expect(await findRequestStatus(anna, viewer)).toBe("PENDING");
  });

  it("ignores a declined request", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    await prisma.connectionRequest.create({
      data: { fromUserId: viewer, toUserId: anna, status: "DECLINED" },
    });
    expect(await findRequestStatus(viewer, anna)).toBeNull();
  });

  it("uses the newest living request when a pair has several", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    // An old pending one, then a newer approved one.
    await prisma.connectionRequest.create({
      data: {
        fromUserId: viewer,
        toUserId: anna,
        status: "PENDING",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    });
    await prisma.connectionRequest.create({
      data: {
        fromUserId: anna,
        toUserId: viewer,
        status: "APPROVED",
        createdAt: new Date("2026-02-01T00:00:00Z"),
      },
    });
    expect(await findRequestStatus(viewer, anna)).toBe("APPROVED");
  });
});

describe("getProfileLookup", () => {
  it("returns not-found for an address nobody has", async () => {
    const viewer = await createPerson(prisma, "viewer");
    expect(await getProfileLookup(viewer, "nobody-with-this-name")).toEqual({
      kind: "not-found",
    });
  });

  it("returns not-found for a suspended person", async () => {
    const viewer = await createPerson(prisma, "viewer");
    await createPerson(prisma, "gone", { suspended: true });
    expect((await getProfileLookup(viewer, "the-test-gone")).kind).toBe("not-found");
  });

  it("returns not-found for someone who hasn't finished their profile", async () => {
    const viewer = await createPerson(prisma, "viewer");
    await createPerson(prisma, "early", { finishedAt: null });
    expect((await getProfileLookup(viewer, "the-test-early")).kind).toBe("not-found");
  });

  it("finds a person from their address and gives only public things", async () => {
    const viewer = await createPerson(prisma, "viewer");
    await createPerson(prisma, "anna", {
      courseId: "business",
      tagIds: ["energy-mad-inventor", "hero-story-corporate-escapee"],
    });

    const lookup = await getProfileLookup(viewer, "the-test-anna");
    if (lookup.kind !== "other") {
      throw new Error(`Expected someone else's profile, got ${lookup.kind}`);
    }

    expect(lookup.profile.alias).toBe("The Test anna");
    expect(lookup.profile.courseName).toBe("Business");
    expect(lookup.profile.bio.length).toBeGreaterThan(0);

    // Nothing private anywhere in what the page receives.
    const everything = JSON.stringify(lookup);
    expect(everything).not.toContain("cohort-test.test");
    expect(everything).not.toContain("test-user-");
  });

  it("groups tags by category, in catalogue order", async () => {
    const viewer = await createPerson(prisma, "viewer");
    // Picked in a jumbled order on purpose: an Energy tag, then a Hero Story.
    await createPerson(prisma, "anna", {
      tagIds: ["energy-mad-inventor", "hero-story-corporate-escapee"],
    });

    const lookup = await getProfileLookup(viewer, "the-test-anna");
    if (lookup.kind !== "other") throw new Error("Expected someone else's profile");

    const categoryOrder = lookup.profile.tagGroups.map((group) => group.categoryId);
    // The catalogue puts Hero Story before Energy (see the README's catalogue
    // table), whatever order the tags were picked in.
    expect(categoryOrder).toEqual(["hero-story", "energy"]);
    // Each group has a readable name, not just an id.
    expect(lookup.profile.tagGroups[0].categoryName).not.toBe("hero-story");
  });

  it("still shows a tag that has since been retired", async () => {
    const viewer = await createPerson(prisma, "viewer");
    await createPerson(prisma, "anna", { tagIds: ["energy-mad-inventor"] });
    await prisma.tag.update({
      where: { id: "energy-mad-inventor" },
      data: { retiredAt: new Date() },
    });

    const lookup = await getProfileLookup(viewer, "the-test-anna");
    if (lookup.kind !== "other") throw new Error("Expected someone else's profile");

    const allTagNames = lookup.profile.tagGroups.flatMap((group) => group.tagNames);
    expect(allTagNames).toHaveLength(1);
  });

  it("returns 'own' with no match section for the viewer's own address", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const lookup = await getProfileLookup(viewer, "the-test-viewer");
    expect(lookup.kind).toBe("own");
    // An "own" result has no `match` key at all, so there is no breakdown and
    // no Connect to show.
    expect("match" in lookup).toBe(false);
  });

  it("includes the breakdown and the connect reason for someone else", async () => {
    const { viewer } = await makeViewerWithTopFiveAndOutsider();
    await prisma.edge.updateMany({ data: { complement: 2, overlap: 1, tension: 1 } });

    const lookup = await getProfileLookup(viewer, "the-test-anna");
    if (lookup.kind !== "other") throw new Error("Expected someone else's profile");

    expect(lookup.match.connectReason).toBe("top-five");
    expect(lookup.match.requestStatus).toBeNull();
    expect(lookup.match.explanation?.score).toBe(9);
    expect(lookup.match.explanation?.sentences).toHaveLength(3);
  });
});

// A helper that calls the route the way Next.js would.
async function callConnect(alias: string): Promise<Response> {
  return POST(new Request(`http://localhost/api/people/${alias}/connect`, { method: "POST" }), {
    params: Promise.resolve({ alias }),
  });
}

describe("POST /api/people/[alias]/connect", () => {
  it("answers 401 when nobody is signed in", async () => {
    await makeViewerWithTopFiveAndOutsider();
    signedInAs.user = null;

    const response = await callConnect("the-test-anna");
    expect(response.status).toBe(401);
  });

  it("answers 404 for an address nobody has", async () => {
    const { viewer } = await makeViewerWithTopFiveAndOutsider();
    signedInAs.user = { id: viewer };

    const response = await callConnect("nobody-with-this-name");
    expect(response.status).toBe(404);
  });

  it("answers 404 for a suspended person", async () => {
    const { viewer } = await makeViewerWithTopFiveAndOutsider();
    await createPerson(prisma, "gone", { suspended: true });
    signedInAs.user = { id: viewer };

    const response = await callConnect("the-test-gone");
    expect(response.status).toBe(404);
  });

  it("answers 403 for someone outside the top 5, and stores nothing", async () => {
    const { viewer } = await makeViewerWithTopFiveAndOutsider();
    signedInAs.user = { id: viewer };

    const response = await callConnect("the-test-ben");
    expect(response.status).toBe(403);
    expect(await prisma.connectionRequest.count()).toBe(0);
  });

  it("passes someone in the top 5 to the stand-in and returns its answer", async () => {
    const { viewer } = await makeViewerWithTopFiveAndOutsider();
    signedInAs.user = { id: viewer };

    const response = await callConnect("the-test-anna");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      sent: false,
      message: REQUESTS_NOT_SWITCHED_ON_MESSAGE,
    });
    // The stand-in stores nothing (track 5 owns that table's rules).
    expect(await prisma.connectionRequest.count()).toBe(0);
  });

  it("lets the glitch match through even outside the top 5", async () => {
    const { viewer, ben } = await makeViewerWithTopFiveAndOutsider();
    await prisma.glitchMatch.create({ data: { userId: viewer, matchedUserId: ben } });
    signedInAs.user = { id: viewer };

    const response = await callConnect("the-test-ben");
    expect(response.status).toBe(200);
  });

  it("answers 403 when you try to connect with yourself", async () => {
    const { viewer } = await makeViewerWithTopFiveAndOutsider();
    signedInAs.user = { id: viewer };

    const response = await callConnect("the-test-viewer");
    expect(response.status).toBe(403);
  });
});
