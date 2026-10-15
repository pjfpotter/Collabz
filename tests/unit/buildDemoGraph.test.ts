// Tests for the graph demo's re-scoring (graph-demo, task 3.2): what
// buildDemoGraph gives back for no picks, for incomplete picks and for two
// different complete sets of picks. Pure functions, no database.

import { describe, expect, it } from "vitest";

import { DEMO_COHORT } from "@/lib/graphDemo/demoCohort";
import {
  arePicksComplete,
  buildDemoGraph,
  NO_PICKS,
  type DemoPicks,
} from "@/lib/graphDemo/buildDemoGraph";

// Two different, complete sets of picks, from the real catalogue.
const PICKS_A: DemoPicks = {
  heroStory: ["hero-story-brilliant-graduate"],
  energy: ["energy-mad-inventor"],
  vibeDiagnosis: ["vibe-diagnosis-visionary-untreated"],
  qualities: ["qualities-fog-into-floor-plan"],
  seeking: ["seeking-makes-money-happen", "seeking-finishes-what-i-start"],
};

const PICKS_B: DemoPicks = {
  heroStory: ["hero-story-outsider"],
  energy: ["energy-sea-captain"],
  vibeDiagnosis: ["vibe-diagnosis-type-a-recovering"],
  qualities: ["qualities-knows-someone", "qualities-room-believes-it"],
  seeking: ["seeking-makes-it-real", "seeking-boring-bits"],
};

describe("arePicksComplete", () => {
  it("is false for no picks", () => {
    expect(arePicksComplete(NO_PICKS)).toBe(false);
  });

  it("is false when one category is still empty", () => {
    expect(arePicksComplete({ ...PICKS_A, seeking: [] })).toBe(false);
  });

  it("is true once every category has its minimum", () => {
    expect(arePicksComplete(PICKS_A)).toBe(true);
  });
});

describe("buildDemoGraph with no picks", () => {
  const { graph } = buildDemoGraph(NO_PICKS);

  it("draws every invented person and a line for every pair", () => {
    const people = DEMO_COHORT.length;
    expect(graph.nodes).toHaveLength(people);
    expect(graph.links).toHaveLength((people * (people - 1)) / 2);
  });

  it("has no viewer, no top 5 and no glitch match", () => {
    expect(graph.nodes.some((node) => node.isViewer)).toBe(false);
    expect(graph.topFive).toHaveLength(0);
    expect(graph.glitchMatch).toBeNull();
  });
});

describe("buildDemoGraph with incomplete picks", () => {
  it("shows the same graph as no picks, so nobody is scored on half a profile", () => {
    const incomplete = buildDemoGraph({ ...PICKS_A, qualities: [] }).graph;
    expect(incomplete.nodes.some((node) => node.isViewer)).toBe(false);
    expect(incomplete.nodes).toHaveLength(DEMO_COHORT.length);
  });
});

describe("buildDemoGraph with complete picks", () => {
  const { graph, details } = buildDemoGraph(PICKS_A);

  it("adds the visitor as the viewer, on top of the invented people", () => {
    expect(graph.nodes).toHaveLength(DEMO_COHORT.length + 1);
    expect(graph.nodes.filter((node) => node.isViewer)).toHaveLength(1);
  });

  it("gives the visitor an alias built the real way, marked as them", () => {
    const viewer = graph.nodes.find((node) => node.isViewer)!;
    expect(viewer.alias).toBe("The Visionary Inventor (you)");
  });

  it("highlights exactly five top matches, best first", () => {
    expect(graph.topFive).toHaveLength(5);
    const scores = graph.topFive.map((node) => node.scoreWithViewer ?? -1);
    expect(scores).toEqual([...scores].sort((first, second) => second - first));
  });

  it("gives a glitch match who is neither the viewer nor in the top 5", () => {
    const glitch = graph.glitchMatch;
    expect(glitch).not.toBeNull();
    expect(glitch!.isViewer).toBe(false);
    expect(graph.topFive.map((node) => node.id)).not.toContain(glitch!.id);
  });

  it("gives the same graph for the same picks every time", () => {
    expect(JSON.stringify(buildDemoGraph(PICKS_A))).toBe(JSON.stringify(buildDemoGraph(PICKS_A)));
  });

  it("explains why a top match fits, with sentences from the real formula", () => {
    const best = graph.topFive[0];
    expect(details[best.id].reasons.length).toBeGreaterThan(0);
  });

  it("lists a person's tags by name in the details", () => {
    const best = graph.topFive[0];
    expect(details[best.id].tagNames.length).toBeGreaterThan(0);
  });
});

describe("buildDemoGraph with different picks", () => {
  it("changes who is in the top 5", () => {
    const topA = buildDemoGraph(PICKS_A).graph.topFive.map((node) => node.id);
    const topB = buildDemoGraph(PICKS_B).graph.topFive.map((node) => node.id);
    expect(topA).not.toEqual(topB);
  });
});

describe("what leaves buildDemoGraph", () => {
  it("never contains a database-style id, only alias addresses", () => {
    const { graph } = buildDemoGraph(PICKS_A);
    const everyId = [
      ...graph.nodes.map((node) => node.id),
      ...graph.links.flatMap((link) => [link.source, link.target]),
    ];
    for (const id of everyId) {
      expect(id).toMatch(/^the-/);
      expect(id).not.toContain("demo-");
    }
  });

  it("never says Pretend anywhere", () => {
    const text = JSON.stringify(buildDemoGraph(PICKS_A));
    expect(text.toLowerCase()).not.toContain("pretend");
  });
});
