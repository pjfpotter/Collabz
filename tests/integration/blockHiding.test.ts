// Tests that a block hides two people from each other everywhere they would
// otherwise meet: top 5, glitch match, graph, people list, profile page and
// match explanation (slice 9, #16, task 1.3), against the test database.
//
// Cast: viewer, plus anna, ben, cara... Anna is the one blocked in most tests.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildGraphData } from "@/lib/cohort/graphData";
import { getConnectPermission, getProfileLookup } from "@/lib/cohort/profile";
import { getPeopleForViewer } from "@/lib/cohort/search";
import { prisma } from "@/lib/db";
import { explainMatch, getTopFive } from "@/lib/matching";
import { explainMatch as standInExplainMatch, getTopFive as standInGetTopFive } from "@/lib/cohort/standIns";
import { ensureGlitchMatch } from "@/lib/matching/glitch";

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

// A viewer plus `count` others named p1, p2, ..., each scored against the
// viewer so that p1 is the best match and the scores go down from there.
async function makeCohort(count: number) {
  const viewer = await createPerson(prisma, "viewer");
  const others: string[] = [];
  for (let n = 1; n <= count; n++) {
    const id = await createPerson(prisma, `p${n}`);
    await createScore(prisma, viewer, id, 100 - n);
    others.push(id);
  }
  return { viewer, others };
}

async function block(blockerId: string, blockedId: string) {
  await prisma.block.create({ data: { blockerId, blockedId } });
}

describe("top 5", () => {
  it("leaves out a blocked person and lets the next best move up (both directions)", async () => {
    const { viewer, others } = await makeCohort(7);
    // p2 blocked the viewer. The viewer must not see p2 either.
    await block(others[1], viewer);

    for (const topFive of [await getTopFive(viewer), await standInGetTopFive(viewer)]) {
      const ids = topFive.map((match) => match.userId);
      expect(ids).toEqual([others[0], others[2], others[3], others[4], others[5]]);
    }
  });

  it("and the blocked person no longer sees the blocker in theirs", async () => {
    const { viewer, others } = await makeCohort(3);
    await block(viewer, others[0]);

    const theirs = await getTopFive(others[0]);

    expect(theirs.map((match) => match.userId)).not.toContain(viewer);
  });

  it("still shows the person to everyone else", async () => {
    const { others } = await makeCohort(3);
    await createScore(prisma, others[0], others[1], 90);
    await block(others[1], others[2]);

    const ids = (await getTopFive(others[0])).map((match) => match.userId);

    expect(ids).toContain(others[1]);
  });
});

describe("glitch match", () => {
  it("replaces a stored glitch match who is now blocked", async () => {
    // 8 others: p1-p5 are the top 5, p6-p8 are the glitch candidates.
    const { viewer, others } = await makeCohort(8);
    await prisma.glitchMatch.create({ data: { userId: viewer, matchedUserId: others[5] } });

    await block(viewer, others[5]);
    const chosen = await ensureGlitchMatch(viewer);

    expect(chosen).not.toBe(others[5]);
    expect([others[6], others[7]]).toContain(chosen);
  });
});

describe("match explanation", () => {
  it("is null for a blocked pair, in both versions and both ways round", async () => {
    const { viewer, others } = await makeCohort(2);
    await block(others[0], viewer);

    expect(await explainMatch(viewer, others[0])).toBeNull();
    expect(await explainMatch(others[0], viewer)).toBeNull();
    expect(await standInExplainMatch(viewer, others[0])).toBeNull();
    // An unblocked person is still explained.
    expect(await standInExplainMatch(viewer, others[1])).not.toBeNull();
  });
});

describe("graph, people list and profile page", () => {
  it("drops the blocked person from the graph for both of them, not for a third person", async () => {
    const { viewer, others } = await makeCohort(3);
    await block(viewer, others[0]);

    const viewerGraph = await buildGraphData(viewer);
    const blockedGraph = await buildGraphData(others[0]);
    const thirdGraph = await buildGraphData(others[1]);

    expect(viewerGraph.nodes.map((n) => n.alias)).not.toContain("The Test p1");
    expect(blockedGraph.nodes.map((n) => n.alias)).not.toContain("The Test viewer");
    expect(thirdGraph.nodes.map((n) => n.alias)).toContain("The Test p1");
    expect(thirdGraph.nodes.map((n) => n.alias)).toContain("The Test viewer");
  });

  it("drops the blocked person from the people list for both of them", async () => {
    const { viewer, others } = await makeCohort(3);
    await block(others[0], viewer);

    const viewerList = (await getPeopleForViewer(viewer)).map((p) => p.userId);
    const blockerList = (await getPeopleForViewer(others[0])).map((p) => p.userId);

    expect(viewerList).not.toContain(others[0]);
    expect(blockerList).not.toContain(viewer);
    expect(viewerList).toContain(others[1]);
  });

  it("makes the profile page 'not found' in both directions", async () => {
    const { viewer, others } = await makeCohort(2);
    await block(viewer, others[0]);

    expect((await getProfileLookup(viewer, "the-test-p1")).kind).toBe("not-found");
    expect((await getProfileLookup(others[0], "the-test-viewer")).kind).toBe("not-found");
    expect((await getProfileLookup(viewer, "the-test-p2")).kind).toBe("other");
  });

  it("gives no connect permission to a blocked glitch match", async () => {
    const { viewer, others } = await makeCohort(8);
    await prisma.glitchMatch.create({ data: { userId: viewer, matchedUserId: others[5] } });
    expect(await getConnectPermission(viewer, others[5])).toBe("glitch");

    await block(others[5], viewer);

    expect(await getConnectPermission(viewer, others[5])).toBeNull();
  });
});
