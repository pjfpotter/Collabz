// Tests for edgeStyle and buildGraph (slice 4, #11, tasks 3.1 and 3.2): the
// parts of the graph's data that need no database.

import { describe, expect, it } from "vitest";

import {
  CROWDED_OPACITY_FLOOR,
  MAX_EDGE_OPACITY,
  MAX_EDGE_WIDTH,
  MIN_EDGE_OPACITY,
  MIN_EDGE_WIDTH,
  UNCROWDED_LINE_COUNT,
  buildGraph,
  edgeStyle,
  type GraphInput,
} from "@/lib/cohort/graphData";
import type { VisiblePerson } from "@/lib/cohort/visiblePeople";

describe("edgeStyle", () => {
  it("draws the highest score at full thickness and its least faint", () => {
    expect(edgeStyle(10, 10)).toMatchObject({ width: MAX_EDGE_WIDTH, opacity: MAX_EDGE_OPACITY });
  });

  it("draws a score of zero at its thinnest and faintest, but still draws it", () => {
    const style = edgeStyle(0, 10);

    expect(style).toMatchObject({ width: MIN_EDGE_WIDTH, opacity: MIN_EDGE_OPACITY });
    // "Every edge is drawn" (Patrick's decision): faint, never invisible.
    expect(style.width).toBeGreaterThan(0);
    expect(style.opacity).toBeGreaterThan(0);
  });

  it("gets thicker and less faint as the score rises", () => {
    const low = edgeStyle(2, 10);
    const middle = edgeStyle(5, 10);
    const high = edgeStyle(8, 10);

    expect(low.width).toBeLessThan(middle.width);
    expect(middle.width).toBeLessThan(high.width);
    expect(low.opacity).toBeLessThan(middle.opacity);
    expect(middle.opacity).toBeLessThan(high.opacity);
  });

  it("keeps a middling score faint: half the top score is drawn an eighth of the way up", () => {
    const style = edgeStyle(5, 10);

    // The strength is in proportion (half)...
    expect(style.strength).toBeCloseTo(0.5);
    // ...but how much the line stands out is the strength multiplied by
    // itself twice (half x half x half = an eighth), so hundreds of middling
    // lines don't drown out the few strong ones.
    expect(style.width).toBeCloseTo(MIN_EDGE_WIDTH + 0.125 * (MAX_EDGE_WIDTH - MIN_EDGE_WIDTH));
    expect(style.opacity).toBeCloseTo(
      MIN_EDGE_OPACITY + 0.125 * (MAX_EDGE_OPACITY - MIN_EDGE_OPACITY),
    );
  });

  it("draws lines just the same until the graph gets crowded", () => {
    // The pretend cohort has 406 lines, under the limit.
    expect(edgeStyle(10, 10, 406)).toEqual(edgeStyle(10, 10));
    expect(edgeStyle(10, 10, UNCROWDED_LINE_COUNT)).toEqual(edgeStyle(10, 10));
  });

  it("makes every line fainter, but no thinner, in a crowded graph", () => {
    const uncrowded = edgeStyle(10, 10);
    // Four times the limit: the square root rule gives half the opacity.
    const crowded = edgeStyle(10, 10, UNCROWDED_LINE_COUNT * 4);

    expect(crowded.opacity).toBeCloseTo(uncrowded.opacity / 2);
    expect(crowded.width).toBe(uncrowded.width);
    expect(crowded.strength).toBe(uncrowded.strength);
  });

  it("never fades a crowded graph's lines below the floor", () => {
    const uncrowded = edgeStyle(10, 10);
    const hugeCohort = edgeStyle(10, 10, 1_000_000);

    expect(hugeCohort.opacity).toBeCloseTo(uncrowded.opacity * CROWDED_OPACITY_FLOOR);
    // Still drawn, however many lines there are.
    expect(edgeStyle(0, 10, 1_000_000).opacity).toBeGreaterThan(0);
  });

  it("measures against the highest score, whatever range the scores have", () => {
    // Pretend scores top out around 10; slice 3's real ones may not. The
    // strongest line should look the same either way.
    expect(edgeStyle(40, 40)).toEqual(edgeStyle(10, 10));
    expect(edgeStyle(20, 40)).toEqual(edgeStyle(5, 10));
  });

  it("draws every line the same when every score is equal", () => {
    // Each score IS the highest, so each is drawn at full strength.
    expect(edgeStyle(3, 3)).toMatchObject({ width: MAX_EDGE_WIDTH, opacity: MAX_EDGE_OPACITY });
  });

  it("draws every line at its faintest when every score is zero", () => {
    const style = edgeStyle(0, 0);

    // The thing to avoid is 0 divided by 0, which is "not a number" and
    // would draw nothing at all.
    expect(style).toMatchObject({ width: MIN_EDGE_WIDTH, opacity: MIN_EDGE_OPACITY });
  });

  it("stays inside the limits for a score below zero or above the highest", () => {
    expect(edgeStyle(-5, 10)).toMatchObject({ width: MIN_EDGE_WIDTH, opacity: MIN_EDGE_OPACITY });
    expect(edgeStyle(99, 10)).toMatchObject({ width: MAX_EDGE_WIDTH, opacity: MAX_EDGE_OPACITY });
  });
});

// Makes one visible person for buildGraph. The user id is deliberately
// nothing like the alias ("id-anna" vs "The Test anna"), so a test can tell
// whether an id leaked into the output.
function makePerson(name: string, courseId = "software"): VisiblePerson {
  return {
    userId: `id-${name}`,
    alias: `The Test ${name}`,
    silhouette: "silhouette-01",
    courseId,
    courseName: courseId === "software" ? "Software" : "Business",
    completedAt: new Date("2026-01-01T00:00:00Z"),
    tags: [],
  };
}

// A small cohort used by most tests below: the viewer and four others.
//
//   viewer - anna : 9   (top 5)
//   viewer - ben  : 6   (top 5)
//   viewer - cara : 2   (viewer's glitch match)
//   viewer - dev  : 1
//   anna   - ben  : 4   (anna's glitch match is ben)
//   cara   - dev  : 3
function smallCohort(): GraphInput {
  return {
    people: [
      makePerson("viewer"),
      makePerson("anna"),
      makePerson("ben", "business"),
      makePerson("cara"),
      makePerson("dev", "business"),
    ],
    edges: [
      { userAId: "id-anna", userBId: "id-viewer", score: 9 },
      { userAId: "id-ben", userBId: "id-viewer", score: 6 },
      { userAId: "id-cara", userBId: "id-viewer", score: 2 },
      { userAId: "id-dev", userBId: "id-viewer", score: 1 },
      { userAId: "id-anna", userBId: "id-ben", score: 4 },
      { userAId: "id-cara", userBId: "id-dev", score: 3 },
    ],
    glitchMatches: [
      { userId: "id-viewer", matchedUserId: "id-cara" },
      { userId: "id-anna", matchedUserId: "id-ben" },
    ],
    viewerId: "id-viewer",
    topFiveUserIds: ["id-anna", "id-ben"],
    matchingUserIds: null,
  };
}

// Finds one node or link in a result by alias address, so the tests read
// "the node for anna" instead of "nodes[1]".
function nodeFor(graph: ReturnType<typeof buildGraph>, name: string) {
  const node = graph.nodes.find((candidate) => candidate.id === `the-test-${name}`);
  if (!node) throw new Error(`no node for ${name}`);
  return node;
}
function linkBetween(graph: ReturnType<typeof buildGraph>, first: string, second: string) {
  const ends = [`the-test-${first}`, `the-test-${second}`];
  const link = graph.links.find(
    (candidate) => ends.includes(candidate.source) && ends.includes(candidate.target),
  );
  if (!link) throw new Error(`no link between ${first} and ${second}`);
  return link;
}

describe("buildGraph", () => {
  it("makes one node per person and one link per score", () => {
    const graph = buildGraph(smallCohort());

    expect(graph.nodes).toHaveLength(5);
    expect(graph.links).toHaveLength(6);
  });

  it("uses the alias address as each node's id, and as the ends of each link", () => {
    const graph = buildGraph(smallCohort());

    expect(graph.nodes.map((node) => node.id).sort()).toEqual([
      "the-test-anna",
      "the-test-ben",
      "the-test-cara",
      "the-test-dev",
      "the-test-viewer",
    ]);
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    for (const link of graph.links) {
      expect(nodeIds.has(link.source)).toBe(true);
      expect(nodeIds.has(link.target)).toBe(true);
    }
  });

  it("carries each person's alias, silhouette and course", () => {
    const graph = buildGraph(smallCohort());

    expect(nodeFor(graph, "ben")).toMatchObject({
      alias: "The Test ben",
      silhouette: "silhouette-01",
      courseId: "business",
      courseName: "Business",
    });
  });

  it("flags only the viewer's own node as the viewer", () => {
    const graph = buildGraph(smallCohort());

    expect(graph.nodes.filter((node) => node.isViewer).map((node) => node.id)).toEqual([
      "the-test-viewer",
    ]);
  });

  it("flags the viewer's top 5 and nobody else", () => {
    const graph = buildGraph(smallCohort());

    expect(graph.nodes.filter((node) => node.isTopFive).map((node) => node.id).sort()).toEqual([
      "the-test-anna",
      "the-test-ben",
    ]);
  });

  it("flags the viewer's glitch match, not anybody else's", () => {
    const graph = buildGraph(smallCohort());

    // Ben is ANNA's glitch match. That must not put a glitch ring on ben
    // when it is the viewer who is looking.
    expect(graph.nodes.filter((node) => node.isGlitch).map((node) => node.id)).toEqual([
      "the-test-cara",
    ]);
  });

  it("gives each node its score with the viewer, and the viewer's own node none", () => {
    const graph = buildGraph(smallCohort());

    expect(nodeFor(graph, "anna").scoreWithViewer).toBe(9);
    expect(nodeFor(graph, "dev").scoreWithViewer).toBe(1);
    expect(nodeFor(graph, "viewer").scoreWithViewer).toBeNull();
  });

  it("marks everyone as matching when no filter is on", () => {
    const graph = buildGraph(smallCohort());

    expect(graph.nodes.every((node) => node.matchesFilter)).toBe(true);
  });

  it("marks only the people who fit when a filter is on", () => {
    const graph = buildGraph({
      ...smallCohort(),
      matchingUserIds: new Set(["id-ben", "id-dev"]),
    });

    expect(graph.nodes.filter((node) => node.matchesFilter).map((node) => node.id).sort()).toEqual([
      "the-test-ben",
      "the-test-dev",
    ]);
    // A filter dims people. It never removes them or their lines.
    expect(graph.nodes).toHaveLength(5);
    expect(graph.links).toHaveLength(6);
  });

  it("marks the lines to the viewer's top 5 and glitch match as the viewer's", () => {
    const graph = buildGraph(smallCohort());

    expect(linkBetween(graph, "viewer", "anna").isViewersMatch).toBe(true);
    expect(linkBetween(graph, "viewer", "ben").isViewersMatch).toBe(true);
    expect(linkBetween(graph, "viewer", "cara").isViewersMatch).toBe(true);
    // Dev is neither top 5 nor the glitch match.
    expect(linkBetween(graph, "viewer", "dev").isViewersMatch).toBe(false);
    // Anna and ben are both in the viewer's top 5, but the line BETWEEN them
    // isn't the viewer's.
    expect(linkBetween(graph, "anna", "ben").isViewersMatch).toBe(false);
  });

  it("marks a glitch line for every glitch match, whoever's it is", () => {
    const graph = buildGraph(smallCohort());

    expect(linkBetween(graph, "viewer", "cara").isGlitch).toBe(true);
    // Anna's glitch match is ben. The edge is stored anna-then-ben...
    expect(linkBetween(graph, "anna", "ben").isGlitch).toBe(true);
    expect(linkBetween(graph, "viewer", "anna").isGlitch).toBe(false);
    expect(linkBetween(graph, "cara", "dev").isGlitch).toBe(false);
  });

  it("marks a glitch line when the pair is stored the other way round", () => {
    // ...and here dev's glitch match is cara, while the edge is stored
    // cara-then-dev.
    const input = smallCohort();
    input.glitchMatches.push({ userId: "id-dev", matchedUserId: "id-cara" });

    const graph = buildGraph(input);

    expect(linkBetween(graph, "cara", "dev").isGlitch).toBe(true);
  });

  it("styles each line by its score against the highest score", () => {
    const graph = buildGraph(smallCohort());

    // 9 is the highest score in the cohort.
    expect(linkBetween(graph, "viewer", "anna")).toMatchObject(edgeStyle(9, 9));
    expect(linkBetween(graph, "anna", "ben")).toMatchObject(edgeStyle(4, 9));
    expect(linkBetween(graph, "anna", "ben").score).toBe(4);
  });

  it("puts the viewer's lines last, so they are drawn on top", () => {
    const graph = buildGraph(smallCohort());

    const flags = graph.links.map((link) => link.isViewersMatch);
    // Three of the six lines are the viewer's (anna, ben, cara).
    expect(flags).toEqual([false, false, false, true, true, true]);
  });

  it("leaves out a line to someone who isn't in the list of people", () => {
    // A suspended person still has scores stored, but isn't visible.
    const input = smallCohort();
    input.edges.push({ userAId: "id-anna", userBId: "id-suspended", score: 50 });

    const graph = buildGraph(input);

    expect(graph.links).toHaveLength(6);
    // And their huge score must not make every other line look faint.
    expect(linkBetween(graph, "viewer", "anna")).toMatchObject(edgeStyle(9, 9));
  });

  it("lists the viewer's top 5 in the order given, and their glitch match", () => {
    const graph = buildGraph(smallCohort());

    expect(graph.topFive.map((node) => node.alias)).toEqual(["The Test anna", "The Test ben"]);
    expect(graph.glitchMatch?.alias).toBe("The Test cara");
  });

  it("has no glitch match when the viewer's isn't visible or doesn't exist", () => {
    const hidden = smallCohort();
    hidden.glitchMatches = [{ userId: "id-viewer", matchedUserId: "id-suspended" }];
    const none = smallCohort();
    none.glitchMatches = [];

    expect(buildGraph(hidden).glitchMatch).toBeNull();
    expect(buildGraph(none).glitchMatch).toBeNull();
  });

  it("contains no email address and no database user id", () => {
    const graph = buildGraph(smallCohort());

    // The whole result as text, exactly as it would be sent to the browser.
    const everything = JSON.stringify(graph);
    expect(everything).not.toContain("@");
    expect(everything).not.toContain("email");
    // Every user id in this test starts "id-", and no alias or address does.
    expect(everything).not.toContain("id-");
    expect(everything).not.toContain("userId");
  });

  it("gives 4,950 links for 100 people who all have a score with each other", () => {
    // A realistic cohort. 100 people make 100 x 99 / 2 = 4,950 pairs.
    const people: VisiblePerson[] = [];
    for (let number = 1; number <= 100; number++) {
      people.push(makePerson(`person${number}`));
    }
    const edges: GraphInput["edges"] = [];
    for (let first = 0; first < people.length; first++) {
      for (let second = first + 1; second < people.length; second++) {
        edges.push({
          userAId: people[first].userId,
          userBId: people[second].userId,
          score: (first + second) % 11,
        });
      }
    }

    const graph = buildGraph({
      people,
      edges,
      glitchMatches: [],
      viewerId: people[0].userId,
      topFiveUserIds: [],
      matchingUserIds: null,
    });

    expect(graph.nodes).toHaveLength(100);
    expect(graph.links).toHaveLength(4950);
  });
});
