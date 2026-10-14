// Tests for src/lib/profile/bio.ts (slice 2, #9, task 3.4).

import { describe, expect, it } from "vitest";

import { generateBio, generateBioLines, joinAsList } from "@/lib/profile/bio";

import { seedCategories } from "../../prisma/seed-data";

describe("generateBio", () => {
  // The example in design decision 5, which uses the spec's
  // "Skills and interests captured" picks.
  it("writes the Corporate Escapee example", () => {
    const bio = generateBio({
      "hero-story": ["The Corporate Escapee"],
      energy: ["Giving Sea Captain Energy"],
      qualities: ["Actually finishes the thing", "Says the hard thing kindly"],
      seeking: ["Someone who finishes what I start"],
      skills: ["Back-end", "Data"],
      interests: ["Climate"],
    });

    expect(bio).toBe(
      "The Corporate Escapee, giving Sea Captain Energy. " +
        "Brings: actually finishes the thing and says the hard thing kindly. " +
        "Looking for: someone who finishes what I start. " +
        "Skills: Back-end and Data. " +
        "Into: Climate.",
    );
  });

  it("leaves out a category with no picks, and ignores ones it doesn't know", () => {
    const lines = generateBioLines({
      "hero-story": ["The Late Bloomer"],
      energy: ["Giving Sea Captain Energy"],
      // A category an admin might add later: not in the bio, and no crash.
      "favourite-snack": ["Crisps"],
      // Vibe shapes the alias, so it's not in the bio either.
      "vibe-diagnosis": ["Rising Sign: Feral"],
    });

    expect(lines).toEqual([
      { label: null, text: "The Late Bloomer, giving Sea Captain Energy." },
    ]);
  });

  it("never says 'undefined' when Hero Story or Energy is missing", () => {
    expect(generateBio({ energy: ["Giving Sea Captain Energy"] })).toBe(
      "Giving Sea Captain Energy.",
    );
    expect(generateBio({})).toBe("");
  });

  // Design risk: "Bio grammar with odd tag names". Every seeded Hero Story
  // and Energy goes through the opening line at least once.
  const heroStories = seedCategories.find((category) => category.id === "hero-story")!.tags;
  const energies = seedCategories.find((category) => category.id === "energy")!.tags;

  it.each(heroStories.map((tag, index) => [tag.name, energies[index].name]))(
    "reads cleanly for %s with %s",
    (heroStory, energy) => {
      const bio = generateBio({ "hero-story": [heroStory], energy: [energy] });
      // One sentence: "<Hero Story>, <energy starting lower-case>."
      expect(bio).toBe(`${heroStory}, ${energy.charAt(0).toLowerCase()}${energy.slice(1)}.`);
      expect(bio).not.toContain("undefined");
      expect(bio).not.toMatch(/\.\.$/); // no double full stop
    },
  );
});

describe("joinAsList", () => {
  it('joins as "a", "a and b", "a, b and c"', () => {
    expect(joinAsList([])).toBe("");
    expect(joinAsList(["a"])).toBe("a");
    expect(joinAsList(["a", "b"])).toBe("a and b");
    expect(joinAsList(["a", "b", "c"])).toBe("a, b and c");
    expect(joinAsList(["a", "b", "c", "d"])).toBe("a, b, c and d");
  });
});
