// Tests for scoreUser and the glitch match, against the test database
// (slice 3, #10, task 4.4).
//
// Hand-made people (tests/helpers/people.ts) are used, not the pretend
// cohort, so every expected answer can be worked out from the test itself.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { ensureGlitchMatch } from "@/lib/matching/glitch";
import { findTopFiveIds } from "@/lib/matching/topFive";
import { scoreUser } from "@/lib/scoring";
import { orderUserPair } from "@/lib/userPair";

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

// A few tags of each kind, handed out in rotation, so a cohort of people has
// a mix of overlaps, complements and tension without any being the same.
const HEROES = ["hero-story-wildcard", "hero-story-late-bloomer", "hero-story-outsider"];
const ENERGIES = ["energy-sea-captain", "energy-feral-gremlin", "energy-wise-hermit"];
const VIBES = ["vibe-diagnosis-villain-era", "vibe-diagnosis-main-character"];
const QUALITIES = [
  "qualities-stays-calm",
  "qualities-goes-deep",
  "qualities-finishes-the-thing",
  "qualities-builds-with-hands",
  "qualities-knows-someone",
];
const SEEKING = [
  "seeking-stays-when-hard",
  "seeking-finishes-what-i-start",
  "seeking-makes-it-real",
  "seeking-knows-the-room",
  "seeking-asks-smart-questions",
];

// Makes `count` finished people, named p0, p1, ... in a fixed order, and
// returns their user ids. They finish one day apart so ties are predictable.
async function makeCohort(count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let index = 0; index < count; index++) {
    const id = await createPerson(prisma, `p${index}`, {
      finishedAt: new Date(Date.UTC(2026, 0, 1 + index)),
      tagIds: [
        HEROES[index % HEROES.length],
        ENERGIES[index % ENERGIES.length],
        VIBES[index % VIBES.length],
        QUALITIES[index % QUALITIES.length],
        SEEKING[(index + 2) % SEEKING.length],
      ],
    });
    ids.push(id);
  }
  return ids;
}

async function scoreEveryone(ids: string[]): Promise<void> {
  for (const id of ids) {
    await scoreUser(id);
  }
}

async function allEdges() {
  return prisma.edge.findMany({ orderBy: [{ userAId: "asc" }, { userBId: "asc" }] });
}

function involves(userId: string) {
  return (edge: { userAId: string; userBId: string }) =>
    edge.userAId === userId || edge.userBId === userId;
}

describe("scoreUser: the scores", () => {
  it("gives a newcomer one edge per other finished person, and none for the rest", async () => {
    const existing = await makeCohort(4);
    await scoreEveryone(existing);
    // Two people who must not be scored against.
    const unfinished = await createPerson(prisma, "unfinished", { finishedAt: null });
    const suspended = await createPerson(prisma, "suspended", { suspended: true });

    // The newcomer arrives and finishes.
    const newcomer = await createPerson(prisma, "newcomer", {
      tagIds: ["hero-story-wildcard", "energy-sea-captain"],
    });
    await scoreUser(newcomer);

    const theirEdges = (await allEdges()).filter(involves(newcomer));
    expect(theirEdges).toHaveLength(4);
    // One per existing person, stored once with the lower id first.
    const others = theirEdges.map((edge) =>
      edge.userAId === newcomer ? edge.userBId : edge.userAId,
    );
    expect(others.sort()).toEqual([...existing].sort());
    for (const edge of theirEdges) {
      expect(edge.userAId < edge.userBId).toBe(true);
    }
    // Nobody unfinished or suspended is in there.
    expect(others).not.toContain(unfinished);
    expect(others).not.toContain(suspended);
  });

  it("stores the three parts, and the total is complement x 3 + overlap + tension", async () => {
    const [anna, ben] = await makeCohort(2);
    await scoreEveryone([anna, ben]);

    const [edge] = await allEdges();

    expect(edge.score).toBe(edge.complement * 3 + edge.overlap + edge.tension);
  });

  it("changes only the rescored user's edges when their answers change", async () => {
    const [anna, ben, cara, dan] = await createCustomFour();
    await scoreEveryone([anna, ben, cara, dan]);
    const before = await allEdges();

    // Ben changes his mind: he now seeks what Anna offers ("stays calm").
    await prisma.profileTag.deleteMany({
      where: { userId: ben, tag: { categoryId: "seeking" } },
    });
    await prisma.profileTag.create({
      data: { userId: ben, tagId: "seeking-stays-when-hard" },
    });
    await scoreUser(ben);
    const after = await allEdges();

    // Same number of rows, so nothing was lost or added.
    expect(after).toHaveLength(before.length);

    // Every pair that does NOT involve Ben is exactly the same row.
    const without = (edges: typeof before) => edges.filter((edge) => !involves(ben)(edge));
    expect(without(after)).toEqual(without(before));

    // And Ben's pair with Anna did change: she can now satisfy what he seeks.
    const pair = orderUserPair(anna, ben);
    const annaBenBefore = before.find((e) => e.userAId === pair.userAId && e.userBId === pair.userBId);
    const annaBenAfter = after.find((e) => e.userAId === pair.userAId && e.userBId === pair.userBId);
    expect(annaBenAfter?.complement).toBe((annaBenBefore?.complement ?? 0) + 1);
  });

  it("gives an unfinished person no edges, and scores nobody against them", async () => {
    const [anna] = await makeCohort(1);
    const unfinished = await createPerson(prisma, "unfinished", { finishedAt: null });

    await scoreUser(unfinished);
    await scoreUser(anna);

    expect(await prisma.edge.count()).toBe(0);
  });

  it("drops a suspended person out of everyone's scores", async () => {
    const [anna, ben, cara] = await makeCohort(3);
    await scoreEveryone([anna, ben, cara]);
    expect((await allEdges()).filter(involves(cara))).toHaveLength(2);

    await prisma.user.update({ where: { id: cara }, data: { suspendedAt: new Date() } });
    await scoreUser(cara);

    const edges = await allEdges();
    expect(edges.filter(involves(cara))).toHaveLength(0);
    // The pair that doesn't involve her is untouched.
    expect(edges).toHaveLength(1);
  });

  it("gives identical rows when called a second time", async () => {
    const ids = await makeCohort(8);
    await scoreEveryone(ids);
    const edgesBefore = await allEdges();
    const glitchBefore = await prisma.glitchMatch.findMany({ orderBy: { userId: "asc" } });

    await scoreUser(ids[3]);
    await scoreUser(ids[3]);

    expect(await allEdges()).toEqual(edgesBefore);
    expect(await prisma.glitchMatch.findMany({ orderBy: { userId: "asc" } })).toEqual(
      glitchBefore,
    );
  });
});

describe("scoreUser: glitch matches", () => {
  it("gives everyone a valid glitch match: not themselves, not in their top 5", async () => {
    const ids = await makeCohort(8);
    await scoreEveryone(ids);

    const edges = await allEdges();
    const finishedAt = new Map(
      (await prisma.profile.findMany()).map((p) => [p.userId, p.completedAt as Date]),
    );
    const glitchRows = await prisma.glitchMatch.findMany();

    // 8 people, so 7 others, 5 in the top 5 and 2 left to choose from.
    expect(glitchRows).toHaveLength(8);
    for (const row of glitchRows) {
      expect(row.matchedUserId).not.toBe(row.userId);
      expect(findTopFiveIds(row.userId, edges, finishedAt)).not.toContain(row.matchedUserId);
    }
  });

  it("gives nobody a glitch match while the cohort is too small", async () => {
    // 6 people: 5 others, all of them in the top 5.
    const ids = await makeCohort(6);
    await scoreEveryone(ids);

    expect(await prisma.glitchMatch.count()).toBe(0);
    expect(await ensureGlitchMatch(ids[0])).toBeNull();
  });

  it("keeps the same glitch match when asked again", async () => {
    const ids = await makeCohort(8);
    await scoreEveryone(ids);

    const first = await ensureGlitchMatch(ids[0]);
    const second = await ensureGlitchMatch(ids[0]);

    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it("gives a glitch match to someone who had none once the cohort has grown", async () => {
    const ids = await makeCohort(6);
    await scoreEveryone(ids);
    expect(await ensureGlitchMatch(ids[0])).toBeNull();

    // Two more people arrive.
    const more = [
      await createPerson(prisma, "late1", { tagIds: ["hero-story-wildcard"] }),
      await createPerson(prisma, "late2", { tagIds: ["hero-story-outsider"] }),
    ];
    await scoreEveryone(more);

    expect(await ensureGlitchMatch(ids[0])).not.toBeNull();
  });

  it("replaces someone's glitch match when that person is suspended", async () => {
    const ids = await makeCohort(8);
    await scoreEveryone(ids);
    // Make person 7 the glitch match of person 0, whatever it was.
    const [owner, target] = [ids[0], ids[7]];
    // (Person 7 must be outside person 0's top 5 for this to be valid.)
    const edges = await allEdges();
    const finishedAt = new Map(
      (await prisma.profile.findMany()).map((p) => [p.userId, p.completedAt as Date]),
    );
    const outsideTopFive = ids
      .filter((id) => id !== owner)
      .find((id) => !findTopFiveIds(owner, edges, finishedAt).includes(id));
    const chosenTarget = outsideTopFive ?? target;
    await prisma.glitchMatch.update({
      where: { userId: owner },
      data: { matchedUserId: chosenTarget },
    });

    await prisma.user.update({ where: { id: chosenTarget }, data: { suspendedAt: new Date() } });
    await scoreUser(chosenTarget);

    const row = await prisma.glitchMatch.findUnique({ where: { userId: owner } });
    // Still has one (7 people are left, so 1 outside the top 5), but not them.
    expect(row).not.toBeNull();
    expect(row?.matchedUserId).not.toBe(chosenTarget);
    // And the suspended person has none of their own.
    expect(await prisma.glitchMatch.findUnique({ where: { userId: chosenTarget } })).toBeNull();
  });

  it("replaces someone's glitch match when rescoring puts that person in their top 5", async () => {
    // Eight people with no tags: the scores below are all hand-set.
    const ids: string[] = [];
    for (let index = 0; index < 8; index++) {
      const tagIds =
        index === 0
          ? ["seeking-finishes-what-i-start"] // X seeks what person 6 will offer
          : index === 6
            ? ["qualities-finishes-the-thing"]
            : [];
      ids.push(
        await createPerson(prisma, `q${index}`, {
          finishedAt: new Date(Date.UTC(2026, 0, 1 + index)),
          tagIds,
        }),
      );
    }
    const [owner, , , , , , person6] = ids;

    // X (person 0) scores 1 with everyone, so the earliest five finishers
    // (persons 1 to 5) are X's top 5, and persons 6 and 7 are outside it.
    for (const other of ids.slice(1)) {
      await createScore(prisma, owner, other, 1);
    }
    // X's glitch match is person 6, which is valid right now.
    await prisma.glitchMatch.create({ data: { userId: owner, matchedUserId: person6 } });

    // Person 6 is rescored. Offering what X seeks gives complement 1, so a
    // score of 3 with X: more than 1, so person 6 climbs into X's top 5.
    await scoreUser(person6);

    const edges = await allEdges();
    const finishedAt = new Map(
      (await prisma.profile.findMany()).map((p) => [p.userId, p.completedAt as Date]),
    );
    expect(findTopFiveIds(owner, edges, finishedAt)).toContain(person6);

    // So person 6 can no longer be X's glitch match.
    const row = await prisma.glitchMatch.findUnique({ where: { userId: owner } });
    expect(row).not.toBeNull();
    expect(row?.matchedUserId).not.toBe(person6);
    expect(findTopFiveIds(owner, edges, finishedAt)).not.toContain(row?.matchedUserId);
  });
});

// Four people whose first answers make the "Ben changes his mind" test
// simple: Anna offers "stays calm" and Ben seeks something she does not.
async function createCustomFour(): Promise<string[]> {
  const anna = await createPerson(prisma, "anna", {
    tagIds: ["hero-story-wildcard", "energy-sea-captain", "qualities-stays-calm"],
  });
  const ben = await createPerson(prisma, "ben", {
    tagIds: ["hero-story-outsider", "energy-feral-gremlin", "seeking-makes-it-real"],
  });
  const cara = await createPerson(prisma, "cara", {
    tagIds: ["hero-story-late-bloomer", "qualities-goes-deep", "seeking-asks-smart-questions"],
  });
  const dan = await createPerson(prisma, "dan", {
    tagIds: ["hero-story-wildcard", "qualities-knows-someone"],
  });
  return [anna, ben, cara, dan];
}
