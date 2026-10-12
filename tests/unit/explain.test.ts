// Tests for "why you match" (slice 3, #10, task 3.2). No database.

import { describe, expect, it } from "vitest";

import { seedPairings } from "../../prisma/seed-data";
import { calculateScore, type Pairing, type PersonTags } from "@/lib/matching/score";
import { explainScore, NO_REASONS_SENTENCE, type TagNames } from "@/lib/matching/explain";

const pairings: Pairing[] = seedPairings.flatMap((pairing) =>
  pairing.qualityTagIds.map((qualityTagId) => ({
    seekingTagId: pairing.seekingTagId,
    qualityTagId,
  })),
);

const tagNames: TagNames = {
  "seeking-finishes-what-i-start": "Someone who finishes what I start",
  "seeking-stays-when-hard": "Someone who stays when it gets hard",
  "qualities-finishes-the-thing": "Actually finishes the thing",
  "qualities-stays-calm": "Stays calm when everyone else is not",
  "energy-sea-captain": "Giving Sea Captain Energy",
  "vibe-diagnosis-main-character": "Main Character Syndrome",
  "skills-coding": "Coding",
  "skills-design": "Design",
  "interests-music": "Music",
};

function person(tags: Partial<PersonTags> = {}): PersonTags {
  return {
    heroStory: [],
    energy: [],
    vibeDiagnosis: [],
    qualities: [],
    seeking: [],
    ...tags,
  };
}

describe("explainScore", () => {
  // A pair with EVERY kind of reason.
  const you = person({
    heroStory: ["hero-story-late-bloomer"],
    energy: ["energy-sea-captain"],
    vibeDiagnosis: ["vibe-diagnosis-main-character"],
    qualities: ["qualities-stays-calm"],
    seeking: ["seeking-finishes-what-i-start"],
    skills: ["skills-coding", "skills-design"],
    interests: ["interests-music"],
  });
  const them = person({
    heroStory: ["hero-story-wildcard"],
    energy: ["energy-sea-captain"],
    vibeDiagnosis: ["vibe-diagnosis-main-character"],
    qualities: ["qualities-finishes-the-thing"],
    seeking: ["seeking-stays-when-hard"],
    skills: ["skills-design"],
    interests: ["interests-music"],
  });

  it("gives one sentence for every reason when a pair has all of them", () => {
    const explanation = explainScore(you, them, pairings, tagNames);

    expect(explanation.reasons.map((reason) => reason.kind)).toEqual([
      "complement", // you seek what they have
      "complement", // they seek what you have
      "energy",
      "vibe",
      "tension",
    ]);
    expect(explanation.sentences).toEqual([
      `You're looking for "Someone who finishes what I start", and they bring "Actually finishes the thing".`,
      `They're looking for "Someone who stays when it gets hard", and you bring "Stays calm when everyone else is not".`,
      `You both picked the same Energy: "Giving Sea Captain Energy".`,
      `You both picked the same Vibe Diagnosis: "Main Character Syndrome".`,
      "Your Hero Stories are different, which adds some spark.",
    ]);
  });

  it("adds up: the points on the reasons equal the score from calculateScore", () => {
    const explanation = explainScore(you, them, pairings, tagNames);
    const fromFormula = calculateScore(you, them, pairings);

    const total = explanation.reasons.reduce((sum, reason) => sum + reason.points, 0);
    expect(total).toBe(fromFormula.score);
    expect(explanation.score).toBe(fromFormula.score);
    expect(explanation.complement).toBe(fromFormula.complement);
    // 2 x 3 + 1 + 1 + 1
    expect(total).toBe(9);
  });

  it("says so, kindly, when a pair has no reasons", () => {
    const a = person({ heroStory: ["hero-story-wildcard"], energy: ["energy-sea-captain"] });
    const b = person({ heroStory: ["hero-story-wildcard"], energy: ["energy-feral-gremlin"] });

    const explanation = explainScore(a, b, pairings, tagNames);

    expect(explanation.reasons).toEqual([]);
    expect(explanation.score).toBe(0);
    expect(explanation.sentences).toEqual([NO_REASONS_SENTENCE]);
  });

  it("lists shared Skills and Interests by name, without changing the score", () => {
    const explanation = explainScore(you, them, pairings, tagNames);
    expect(explanation.sharedSkills).toEqual(["Design"]);
    expect(explanation.sharedInterests).toEqual(["Music"]);

    // The same pair with their Skills and Interests taken away scores the same.
    const stripped = explainScore(
      { ...you, skills: [], interests: [] },
      { ...them, skills: [], interests: [] },
      pairings,
      tagNames,
    );
    expect(stripped.score).toBe(explanation.score);
    expect(stripped.sharedSkills).toEqual([]);
    expect(stripped.sharedInterests).toEqual([]);
  });

  it("names every satisfying Quality once for a Seeking tag with two of them", () => {
    const a = person({ seeking: ["seeking-makes-money-happen"] });
    const b = person({
      qualities: ["qualities-room-believes-it", "qualities-knows-someone"],
    });

    const explanation = explainScore(a, b, pairings, {});

    // Counted once (3 points) but both Qualities are named, in id order.
    expect(explanation.reasons).toHaveLength(1);
    expect(explanation.reasons[0].points).toBe(3);
    expect(explanation.sentences[0]).toBe(
      `You're looking for "seeking-makes-money-happen", and they bring "qualities-knows-someone" and "qualities-room-believes-it".`,
    );
  });

  it("falls back to the tag id when a name is missing, rather than failing", () => {
    const a = person({ energy: ["energy-unknown"] });
    const b = person({ energy: ["energy-unknown"] });

    const explanation = explainScore(a, b, pairings, {});

    expect(explanation.sentences).toEqual([`You both picked the same Energy: "energy-unknown".`]);
  });
});
