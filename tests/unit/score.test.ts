// Tests for the chemistry score formula (slice 3, #10, task 3.1).
//
// No database: calculateScore is plain arithmetic on plain objects. The
// pairings used are the real seeded ones (prisma/seed-data.ts), flattened to
// the { seekingTagId, qualityTagId } shape the formula takes.

import { describe, expect, it } from "vitest";

import { seedPairings } from "../../prisma/seed-data";
import {
  calculateScore,
  findSatisfiedSeekingTags,
  type Pairing,
  type PersonTags,
} from "@/lib/matching/score";

const pairings: Pairing[] = seedPairings.flatMap((pairing) =>
  pairing.qualityTagIds.map((qualityTagId) => ({
    seekingTagId: pairing.seekingTagId,
    qualityTagId,
  })),
);

// Builds a person. Anything not given is empty, so each test only mentions
// what it cares about.
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

describe("calculateScore: a hand-worked example", () => {
  // THE WORKED EXAMPLE, by hand from the brief's formula:
  //
  //   Anna seeks "finishes what I start" and "knows the room".
  //   Ben has "actually finishes the thing" and "knows someone who knows
  //   someone", which satisfy both          -> 2 of Anna's Seeking tags.
  //   Ben seeks "stays when it gets hard".
  //   Anna has "stays calm when everyone else is not", which satisfies it
  //                                          -> 1 of Ben's Seeking tags.
  //   complement = 2 + 1 = 3, and 3 x 3 = 9
  //   both picked the same Energy             -> overlap +1
  //   their Vibe Diagnoses differ             -> no bonus
  //   their Hero Stories differ               -> tension +1
  //
  //   score = 9 + 1 + 1 = 11
  const anna = person({
    heroStory: ["hero-story-late-bloomer"],
    energy: ["energy-sea-captain"],
    vibeDiagnosis: ["vibe-diagnosis-main-character"],
    qualities: ["qualities-stays-calm"],
    seeking: ["seeking-finishes-what-i-start", "seeking-knows-the-room"],
  });
  const ben = person({
    heroStory: ["hero-story-wildcard"],
    energy: ["energy-sea-captain"],
    vibeDiagnosis: ["vibe-diagnosis-villain-era"],
    qualities: ["qualities-finishes-the-thing", "qualities-knows-someone"],
    seeking: ["seeking-stays-when-hard"],
  });

  it("gives 11 for the worked example, split into its three parts", () => {
    expect(calculateScore(anna, ben, pairings)).toEqual({
      score: 11,
      complement: 3,
      overlap: 1,
      tension: 1,
    });
  });

  it("gives the same answer whichever way round the two people are", () => {
    expect(calculateScore(ben, anna, pairings)).toEqual(calculateScore(anna, ben, pairings));
  });
});

describe("calculateScore: complement", () => {
  it("counts a Seeking tag once even when two of the other person's Qualities satisfy it", () => {
    // "makes money happen" is satisfied by BOTH "knows someone" and "room
    // believes it". Ben has both. It must still count as one.
    const anna = person({ seeking: ["seeking-makes-money-happen"] });
    const ben = person({
      qualities: ["qualities-knows-someone", "qualities-room-believes-it"],
    });

    expect(findSatisfiedSeekingTags(anna, ben, pairings)).toEqual([
      "seeking-makes-money-happen",
    ]);
    expect(calculateScore(anna, ben, pairings).complement).toBe(1);
  });

  it("counts both directions", () => {
    // Each seeks what the other has: 1 + 1 = 2.
    const anna = person({
      qualities: ["qualities-builds-with-hands"],
      seeking: ["seeking-finishes-what-i-start"],
    });
    const ben = person({
      qualities: ["qualities-finishes-the-thing"],
      seeking: ["seeking-makes-it-real"],
    });

    expect(calculateScore(anna, ben, pairings).complement).toBe(2);
  });

  it("counts one direction only when the other person seeks nothing you offer", () => {
    const anna = person({ seeking: ["seeking-finishes-what-i-start"] });
    const ben = person({ qualities: ["qualities-finishes-the-thing"] });

    const result = calculateScore(anna, ben, pairings);
    expect(result.complement).toBe(1);
    expect(result.score).toBe(3);
  });

  it("counts nothing for a Quality that no pairing connects to what was sought", () => {
    // "beautiful on purpose" does not satisfy "finishes what I start".
    const anna = person({ seeking: ["seeking-finishes-what-i-start"] });
    const ben = person({ qualities: ["qualities-beautiful-on-purpose"] });

    expect(calculateScore(anna, ben, pairings).complement).toBe(0);
  });

  it("uses only the pairings it is given", () => {
    const anna = person({ seeking: ["seeking-finishes-what-i-start"] });
    const ben = person({ qualities: ["qualities-finishes-the-thing"] });

    // With the pairing list empty, nothing is satisfied.
    expect(calculateScore(anna, ben, []).complement).toBe(0);
  });
});

describe("calculateScore: overlap", () => {
  it("gives +1 for the same Energy", () => {
    const a = person({ energy: ["energy-sea-captain"] });
    const b = person({ energy: ["energy-sea-captain"] });
    expect(calculateScore(a, b, pairings).overlap).toBe(1);
  });

  it("gives +1 for the same Vibe Diagnosis", () => {
    const a = person({ vibeDiagnosis: ["vibe-diagnosis-main-character"] });
    const b = person({ vibeDiagnosis: ["vibe-diagnosis-main-character"] });
    expect(calculateScore(a, b, pairings).overlap).toBe(1);
  });

  it("gives +2 for both, and 0 for neither", () => {
    const same = person({
      energy: ["energy-sea-captain"],
      vibeDiagnosis: ["vibe-diagnosis-main-character"],
    });
    const different = person({
      energy: ["energy-feral-gremlin"],
      vibeDiagnosis: ["vibe-diagnosis-villain-era"],
    });
    expect(calculateScore(same, same, pairings).overlap).toBe(2);
    expect(calculateScore(same, different, pairings).overlap).toBe(0);
  });
});

describe("calculateScore: tension", () => {
  it("gives +1 when the Hero Stories differ", () => {
    const a = person({ heroStory: ["hero-story-late-bloomer"] });
    const b = person({ heroStory: ["hero-story-wildcard"] });
    expect(calculateScore(a, b, pairings).tension).toBe(1);
  });

  it("gives nothing when the Hero Stories are the same", () => {
    const a = person({ heroStory: ["hero-story-wildcard"] });
    const b = person({ heroStory: ["hero-story-wildcard"] });
    expect(calculateScore(a, b, pairings).tension).toBe(0);
  });

  it("gives nothing when someone has no Hero Story to compare", () => {
    const a = person({ heroStory: ["hero-story-wildcard"] });
    const b = person({});
    expect(calculateScore(a, b, pairings).tension).toBe(0);
  });
});

describe("calculateScore: what must not change the score", () => {
  it("is not changed by Skills or Interests", () => {
    const plain = person({ energy: ["energy-sea-captain"] });
    const withExtras = person({
      energy: ["energy-sea-captain"],
      skills: ["skills-coding", "skills-design"],
      interests: ["interests-music"],
    });
    const otherWithSameExtras = person({
      energy: ["energy-sea-captain"],
      skills: ["skills-coding", "skills-design"],
      interests: ["interests-music"],
    });

    // The same two people, with and without shared Skills and Interests.
    expect(calculateScore(withExtras, otherWithSameExtras, pairings)).toEqual(
      calculateScore(plain, plain, pairings),
    );
  });

  it("gives 0 for two people with nothing in common and no tags", () => {
    expect(calculateScore(person(), person(), pairings)).toEqual({
      score: 0,
      complement: 0,
      overlap: 0,
      tension: 0,
    });
  });

  it("never goes above the ceiling of 27 with the 4-pick limit (design 2)", () => {
    // 4 Seeking tags each way, every one satisfied, plus both overlaps and
    // different Hero Stories: 8 x 3 + 2 + 1 = 27.
    const seekers = [
      "seeking-finishes-what-i-start",
      "seeking-makes-it-real",
      "seeking-tells-me-idea-is-bad",
      "seeking-stays-when-hard",
    ];
    const providers = [
      "qualities-finishes-the-thing",
      "qualities-builds-with-hands",
      "qualities-says-hard-thing-kindly",
      "qualities-stays-calm",
    ];
    const a = person({
      heroStory: ["hero-story-wildcard"],
      energy: ["energy-sea-captain"],
      vibeDiagnosis: ["vibe-diagnosis-main-character"],
      qualities: providers,
      seeking: seekers,
    });
    const b = person({
      heroStory: ["hero-story-late-bloomer"],
      energy: ["energy-sea-captain"],
      vibeDiagnosis: ["vibe-diagnosis-main-character"],
      qualities: providers,
      seeking: seekers,
    });

    expect(calculateScore(a, b, pairings).score).toBe(27);
  });
});
