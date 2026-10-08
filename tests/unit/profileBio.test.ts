// Tests for the profileBio stand-in (slice 4, #11, task 2.3): one plain
// sentence from a person's Hero Story and Energy. Slice 2 (#9) replaces it
// with generateBio() at join-up.

import { describe, expect, it } from "vitest";

import { profileBio } from "@/lib/cohort/standIns";

describe("profileBio", () => {
  it("joins the Hero Story and the Energy into one sentence", () => {
    const bio = profileBio({
      "hero-story": ["The Corporate Escapee"],
      energy: ["Giving Sea Captain Energy"],
    });

    expect(bio).toBe("The Corporate Escapee, giving Sea Captain Energy.");
  });

  it("ignores every other category", () => {
    const bio = profileBio({
      "hero-story": ["The Corporate Escapee"],
      energy: ["Giving Sea Captain Energy"],
      qualities: ["Actually finishes the thing"],
    });

    expect(bio).not.toContain("finishes");
  });

  it("uses just the Hero Story when there is no Energy", () => {
    expect(profileBio({ "hero-story": ["The Corporate Escapee"] })).toBe(
      "The Corporate Escapee.",
    );
  });

  it("uses just the Energy when there is no Hero Story", () => {
    expect(profileBio({ energy: ["Giving Sea Captain Energy"] })).toBe(
      "Giving Sea Captain Energy.",
    );
  });

  it("still returns a readable sentence when there are no tags at all", () => {
    const bio = profileBio({});

    expect(bio).not.toContain("undefined");
    expect(bio.length).toBeGreaterThan(0);
  });
});
