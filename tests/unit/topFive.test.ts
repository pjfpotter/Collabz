// Tests for the top 5 ranking rule (slice 3, #10). No database.

import { describe, expect, it } from "vitest";

import { findTopFiveIds, type ScoredEdge } from "@/lib/matching/topFive";

const early = new Date("2026-01-01T00:00:00Z");
const late = new Date("2026-02-01T00:00:00Z");

// Everyone is eligible and finished at the same time unless a test says so.
function finishedAt(ids: string[], when: Date = early): Map<string, Date> {
  return new Map(ids.map((id) => [id, when]));
}

describe("findTopFiveIds", () => {
  it("ranks highest score first and returns at most five", () => {
    const edges: ScoredEdge[] = [
      { userAId: "me", userBId: "p1", score: 1 },
      { userAId: "me", userBId: "p2", score: 9 },
      { userAId: "me", userBId: "p3", score: 5 },
      { userAId: "me", userBId: "p4", score: 7 },
      { userAId: "me", userBId: "p5", score: 3 },
      { userAId: "me", userBId: "p6", score: 8 },
    ];
    const ids = ["p1", "p2", "p3", "p4", "p5", "p6"];

    expect(findTopFiveIds("me", edges, finishedAt(ids))).toEqual(["p2", "p6", "p4", "p3", "p5"]);
  });

  it("finds the owner's rows whichever side of the pair they are on", () => {
    const edges: ScoredEdge[] = [
      { userAId: "me", userBId: "z", score: 4 },
      { userAId: "a", userBId: "me", score: 6 },
    ];
    expect(findTopFiveIds("me", edges, finishedAt(["a", "z"]))).toEqual(["a", "z"]);
  });

  it("puts the earlier finisher first when scores are equal", () => {
    const edges: ScoredEdge[] = [
      { userAId: "me", userBId: "aaa", score: 5 },
      { userAId: "me", userBId: "zzz", score: 5 },
    ];
    const finished = new Map([
      ["aaa", late],
      ["zzz", early],
    ]);
    // "aaa" has the lower id, but "zzz" finished first.
    expect(findTopFiveIds("me", edges, finished)).toEqual(["zzz", "aaa"]);
  });

  it("falls back to the lower user id, in the same order every time", () => {
    const edges: ScoredEdge[] = [
      { userAId: "me", userBId: "pb", score: 5 },
      { userAId: "me", userBId: "pa", score: 5 },
    ];
    const finished = finishedAt(["pa", "pb"]);
    expect(findTopFiveIds("me", edges, finished)).toEqual(["pa", "pb"]);
    expect(findTopFiveIds("me", [...edges].reverse(), finished)).toEqual(["pa", "pb"]);
  });

  it("leaves out anyone who is not eligible", () => {
    const edges: ScoredEdge[] = [
      { userAId: "me", userBId: "suspended", score: 99 },
      { userAId: "me", userBId: "ok", score: 1 },
    ];
    expect(findTopFiveIds("me", edges, finishedAt(["ok"]))).toEqual(["ok"]);
  });

  it("lists fewer than five when fewer people are available", () => {
    const edges: ScoredEdge[] = [{ userAId: "me", userBId: "p1", score: 2 }];
    expect(findTopFiveIds("me", edges, finishedAt(["p1"]))).toEqual(["p1"]);
  });

  it("ignores other people's pairs", () => {
    const edges: ScoredEdge[] = [{ userAId: "x", userBId: "y", score: 50 }];
    expect(findTopFiveIds("me", edges, finishedAt(["x", "y"]))).toEqual([]);
  });
});
