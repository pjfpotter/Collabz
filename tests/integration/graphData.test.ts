// Tests for buildGraphData (slice 4, #11, task 3.3): the graph's data loaded
// from the real database, with a few hand-made people so the expected answer
// is obvious. The rules themselves are tested without a database in
// tests/unit/graphData.test.ts; this checks they are fed the right rows.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildGraphData } from "@/lib/cohort/graphData";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson, createScore } from "../helpers/people";

// The two ends of a link, sorted, so a test doesn't care which way round the
// pair happens to be stored.
function endsOf(link: { source: string; target: string }): string[] {
  return [link.source, link.target].sort();
}

describe("buildGraphData", () => {
  beforeEach(async () => {
    await emptyDatabase(prisma);
    await seedCatalogue(prisma);
  });

  afterAll(async () => {
    // No restoring here: tests/helpers/restoreDevData.ts puts the database
    // back once, after the whole test run.
    await prisma.$disconnect();
  });

  it("returns a node for each visible person and a link for each score", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna", { courseId: "business" });
    const ben = await createPerson(prisma, "ben");
    await createScore(prisma, viewer, anna, 7);
    await createScore(prisma, viewer, ben, 3);
    await createScore(prisma, anna, ben, 5);

    const graph = await buildGraphData(viewer);

    expect(graph.nodes.map((node) => node.id).sort()).toEqual([
      "the-test-anna",
      "the-test-ben",
      "the-test-viewer",
    ]);
    expect(graph.links).toHaveLength(3);
    expect(graph.nodes.find((node) => node.id === "the-test-anna")).toMatchObject({
      courseName: "Business",
      isTopFive: true,
      scoreWithViewer: 7,
    });
    expect(graph.nodes.find((node) => node.id === "the-test-viewer")?.isViewer).toBe(true);
    expect(graph.topFive.map((node) => node.alias)).toEqual(["The Test anna", "The Test ben"]);
  });

  it("leaves out a suspended person and every line to them", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    const suspended = await createPerson(prisma, "sam", { suspended: true });
    await createScore(prisma, viewer, anna, 2);
    await createScore(prisma, viewer, suspended, 9);
    await createScore(prisma, anna, suspended, 9);

    const graph = await buildGraphData(viewer);

    expect(graph.nodes.map((node) => node.id).sort()).toEqual([
      "the-test-anna",
      "the-test-viewer",
    ]);
    expect(graph.links.map(endsOf)).toEqual([["the-test-anna", "the-test-viewer"]]);
    expect(graph.topFive.map((node) => node.alias)).toEqual(["The Test anna"]);
  });

  it("leaves out someone who hasn't finished their profile", async () => {
    const viewer = await createPerson(prisma, "viewer");
    await createPerson(prisma, "una", { finishedAt: null });

    const graph = await buildGraphData(viewer);

    expect(graph.nodes.map((node) => node.id)).toEqual(["the-test-viewer"]);
  });

  it("marks the glitch line when the glitch match belongs to the lower user id", async () => {
    // "test-user-a" sorts before "test-user-z", so the edge is stored a-then-z
    // and the glitch match points the same way.
    const viewer = await createPerson(prisma, "a");
    const other = await createPerson(prisma, "z");
    await createScore(prisma, viewer, other, 1);
    await prisma.glitchMatch.create({ data: { userId: viewer, matchedUserId: other } });

    const graph = await buildGraphData(viewer);

    expect(graph.links[0].isGlitch).toBe(true);
    expect(graph.links[0].isViewersMatch).toBe(true);
    expect(graph.glitchMatch?.alias).toBe("The Test z");
  });

  it("marks the glitch line when the glitch match belongs to the higher user id", async () => {
    // The same pair, but now it is z whose glitch match is a: the edge is
    // still stored a-then-z, so the glitch match points the OTHER way.
    const viewer = await createPerson(prisma, "a");
    const other = await createPerson(prisma, "z");
    await createScore(prisma, viewer, other, 1);
    await prisma.glitchMatch.create({ data: { userId: other, matchedUserId: viewer } });

    const graph = await buildGraphData(viewer);

    // The line is dashed for everyone...
    expect(graph.links[0].isGlitch).toBe(true);
    // ...but z is not the VIEWER's glitch match, so the viewer gets no
    // glitch match and z's node gets no glitch ring. (z is still in the
    // viewer's top 5, being the only other person, so isViewersMatch isn't
    // checked here.)
    expect(graph.glitchMatch).toBeNull();
    expect(graph.nodes.find((node) => node.id === "the-test-z")?.isGlitch).toBe(false);
  });

  it("doesn't mark a line as glitch when neither person is the other's glitch match", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    const ben = await createPerson(prisma, "ben");
    await createScore(prisma, viewer, anna, 1);
    await createScore(prisma, viewer, ben, 1);
    await createScore(prisma, anna, ben, 1);
    await prisma.glitchMatch.create({ data: { userId: anna, matchedUserId: ben } });

    const graph = await buildGraphData(viewer);

    const glitchLinks = graph.links.filter((link) => link.isGlitch).map(endsOf);
    expect(glitchLinks).toEqual([["the-test-anna", "the-test-ben"]]);
  });

  it("sends nothing to the browser that identifies a person privately", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    await createScore(prisma, viewer, anna, 4);
    await prisma.glitchMatch.create({ data: { userId: viewer, matchedUserId: anna } });

    const everything = JSON.stringify(await buildGraphData(viewer));

    // Emails end "@cohort-test.test" and user ids start "test-user-" (see
    // tests/helpers/people.ts). Neither may appear anywhere.
    expect(everything).not.toContain("@");
    expect(everything).not.toContain("test-user-");
  });
});
