// Tests for the glitch match RULES (slice 3, #10, task 4.2). No database:
// these are the plain functions in src/lib/matching/glitch.ts.

import { describe, expect, it } from "vitest";

import {
  chooseGlitchMatch,
  isGlitchMatchValid,
  pickGlitchMatch,
} from "@/lib/matching/glitch";

// A "random" source that always gives the same number, so a pick is
// repeatable. 0 picks the first option, 0.99 the last.
const alwaysFirst = () => 0;
const alwaysLast = () => 0.99;

const everyone = ["a", "b", "c", "d", "e", "f", "g", "h"];
const topFive = ["b", "c", "d", "e", "f"];

describe("pickGlitchMatch", () => {
  it("never picks yourself", () => {
    // Only "a" (the user) and the top 5 are around: nobody else qualifies.
    expect(pickGlitchMatch("a", ["a", ...topFive], topFive, alwaysFirst)).toBeNull();
  });

  it("never picks anyone in the top 5, whatever the random number", () => {
    for (const random of [0, 0.2, 0.5, 0.8, 0.99]) {
      const picked = pickGlitchMatch("a", everyone, topFive, () => random);
      // Only "g" and "h" are neither "a" nor in the top 5.
      expect(["g", "h"]).toContain(picked);
    }
  });

  it("is repeatable: the same random number gives the same person", () => {
    expect(pickGlitchMatch("a", everyone, topFive, alwaysFirst)).toBe("g");
    expect(pickGlitchMatch("a", everyone, topFive, alwaysLast)).toBe("h");
    // And it doesn't depend on the order the candidates were listed in.
    expect(pickGlitchMatch("a", [...everyone].reverse(), topFive, alwaysFirst)).toBe("g");
  });

  it("returns null when nobody is eligible", () => {
    expect(pickGlitchMatch("a", [], [], alwaysFirst)).toBeNull();
    expect(pickGlitchMatch("a", ["a"], [], alwaysFirst)).toBeNull();
  });

  it("copes with a random source that returns exactly 1", () => {
    expect(pickGlitchMatch("a", everyone, topFive, () => 1)).toBe("h");
  });
});

describe("isGlitchMatchValid", () => {
  it("accepts an eligible person outside the top 5", () => {
    expect(isGlitchMatchValid("a", "g", everyone, topFive)).toBe(true);
  });

  it("rejects yourself, someone in the top 5 and someone not eligible", () => {
    expect(isGlitchMatchValid("a", "a", everyone, topFive)).toBe(false);
    expect(isGlitchMatchValid("a", "c", everyone, topFive)).toBe(false);
    expect(isGlitchMatchValid("a", "zed", everyone, topFive)).toBe(false);
  });
});

describe("chooseGlitchMatch", () => {
  it("keeps the stored match while it is still valid (stays the same on reload)", () => {
    // alwaysFirst would pick "g", but the stored "h" is still valid.
    expect(chooseGlitchMatch("a", "h", everyone, topFive, alwaysFirst)).toBe("h");
  });

  it("replaces it when that person is no longer eligible (suspended)", () => {
    const withoutH = everyone.filter((id) => id !== "h");
    expect(chooseGlitchMatch("a", "h", withoutH, topFive, alwaysFirst)).toBe("g");
  });

  it("replaces it when that person has entered the top 5", () => {
    const newTopFive = ["b", "c", "d", "e", "h"];
    // "h" is now a top 5 match, so it can't also be the glitch match.
    expect(chooseGlitchMatch("a", "h", everyone, newTopFive, alwaysFirst)).toBe("f");
  });

  it("chooses a first one when there is none stored", () => {
    expect(chooseGlitchMatch("a", null, everyone, topFive, alwaysFirst)).toBe("g");
  });

  it("returns null, so the stored one is dropped, when nobody qualifies any more", () => {
    expect(chooseGlitchMatch("a", "h", ["a", ...topFive], topFive, alwaysFirst)).toBeNull();
  });
});
