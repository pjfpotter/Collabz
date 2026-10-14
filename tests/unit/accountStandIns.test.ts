// Tests for slice 7's stand-ins for slice 2 (#14, task 4.1).
//
// checkEditedPicks decides which edits are saved, so every rule in the
// account-management spec's "Edited answers follow the onboarding rules"
// gets a test. When slice 2 lands, these move to its real functions.

import { describe, expect, it } from "vitest";

import {
  SILHOUETTE_IDS,
  bioLines,
  bioStandIn,
  checkEditedPicks,
  type EditableCategory,
} from "@/lib/account/standIns";

// A small made-up category: up to 4 picks, at least 1, one retired tag.
const skills: EditableCategory = {
  id: "skills",
  name: "Skills",
  pickMin: 1,
  pickMax: 4,
  tags: ["a", "b", "c", "d", "e"].map((letter) => ({
    id: `skills-${letter}`,
    name: `Skill ${letter}`,
    description: "",
    retired: false,
  })),
};
skills.tags.push({ id: "skills-old", name: "Old Skill", description: "", retired: true });

describe("checkEditedPicks", () => {
  it("accepts picks within the limits", () => {
    expect(checkEditedPicks(["skills-a", "skills-b"], skills, [])).toBeNull();
  });

  // Spec: "Pick limit kept": five Skills.
  it("refuses one pick too many, saying the limit", () => {
    const problem = checkEditedPicks(
      ["skills-a", "skills-b", "skills-c", "skills-d", "skills-e"],
      skills,
      [],
    );
    expect(problem).toBe("Pick between 1 and 4.");
  });

  // Spec: "Pick limit kept": no Qualities.
  it("refuses no picks when at least one is needed", () => {
    expect(checkEditedPicks([], skills, ["skills-a"])).toBe("Pick between 1 and 4.");
  });

  it("says 'exactly' for a pick-one category", () => {
    const energy = { ...skills, id: "energy", name: "Energy", pickMin: 1, pickMax: 1 };
    expect(checkEditedPicks(["skills-a", "skills-b"], energy, [])).toBe("Pick exactly 1.");
  });

  // Spec: "Tag from another category refused".
  it("refuses a tag from another category", () => {
    expect(checkEditedPicks(["qualities-calm"], skills, [])).toContain("isn't one of the Skills");
  });

  it("refuses the same tag twice", () => {
    expect(checkEditedPicks(["skills-a", "skills-a"], skills, [])).toContain("only be picked once");
  });

  // Spec: "Retired tag kept but not offered".
  it("lets someone keep a retired tag they already had", () => {
    expect(checkEditedPicks(["skills-old", "skills-a"], skills, ["skills-old"])).toBeNull();
  });

  it("refuses picking a retired tag they didn't already have", () => {
    expect(checkEditedPicks(["skills-old"], skills, [])).toContain("no longer offered");
  });
});

describe("bioStandIn", () => {
  it("builds sentences from the picked tags, as #9's design describes", () => {
    const bio = bioStandIn({
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
        "Skills: Back-end and Data. Into: Climate.",
    );
  });

  it("joins three or more with commas and a final 'and'", () => {
    expect(bioStandIn({ skills: ["A", "B", "C"] })).toBe("Skills: A, B and C.");
  });

  // Skills and Interests don't exist until slice 2 seeds them.
  it("leaves out categories with no picks", () => {
    expect(bioStandIn({ "hero-story": ["The Late Bloomer"] })).toBe("The Late Bloomer.");
  });

  it("ignores categories it doesn't know, e.g. Vibe Diagnosis", () => {
    expect(bioStandIn({ "vibe-diagnosis": ["Rising Sign: Feral"] })).toBe("");
  });
});

describe("bioLines", () => {
  // The /account page shows each line as its own paragraph, label in bold.
  it("gives the opening sentence, then one labelled line per category", () => {
    expect(
      bioLines({
        "hero-story": ["The Quiet Veteran"],
        energy: ["Giving Mad Inventor Energy"],
        qualities: ["Actually finishes the thing", "Makes the room believe it too"],
        seeking: ["Someone who finishes what I start"],
      }),
    ).toEqual([
      { label: null, text: "The Quiet Veteran, giving Mad Inventor Energy." },
      { label: "Brings", text: "actually finishes the thing and makes the room believe it too." },
      { label: "Looking for", text: "someone who finishes what I start." },
    ]);
  });
});

describe("SILHOUETTE_IDS", () => {
  it("lists the 12 ids slice 2's design names", () => {
    expect(SILHOUETTE_IDS).toHaveLength(12);
    expect(SILHOUETTE_IDS[0]).toBe("silhouette-01");
    expect(SILHOUETTE_IDS[11]).toBe("silhouette-12");
  });
});
