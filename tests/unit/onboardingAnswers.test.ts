// Tests for src/lib/profile/validateAnswers.ts and silhouettes.ts
// (slice 2, #9, tasks 3.1 and 3.2).

import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SILHOUETTES, SILHOUETTE_IDS, silhouetteUrl } from "@/lib/profile/silhouettes";
import {
  validateOnboardingAnswers,
  type CatalogueForChecking,
  type OnboardingAnswers,
} from "@/lib/profile/validateAnswers";

// A small catalogue: one pick-exactly-1 category and one pick-1-to-4, with
// tags a, b, c... Retired tags are simply not in it (the loader leaves them
// out), which is how the real one behaves.
const catalogue: CatalogueForChecking = [
  { id: "energy", name: "Energy", pickMin: 1, pickMax: 1, tags: tags("energy", 3) },
  { id: "seeking", name: "Seeking", pickMin: 1, pickMax: 4, tags: tags("seeking", 6) },
];

function tags(categoryId: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({ id: `${categoryId}-${index + 1}` }));
}

// A valid set, which each test then breaks in one way.
function validAnswers(): OnboardingAnswers {
  return {
    picks: { energy: ["energy-1"], seeking: ["seeking-1", "seeking-2"] },
    silhouetteId: "silhouette-03",
  };
}

describe("validateOnboardingAnswers", () => {
  it("finds nothing wrong with a valid set", () => {
    expect(validateOnboardingAnswers(validAnswers(), catalogue)).toEqual([]);
  });

  // Spec scenario: "Invalid answers are rejected by the server" (5 Seeking)
  it("refuses more than the maximum", () => {
    const answers = validAnswers();
    answers.picks.seeking = ["seeking-1", "seeking-2", "seeking-3", "seeking-4", "seeking-5"];

    expect(validateOnboardingAnswers(answers, catalogue)).toEqual([
      { step: "seeking", message: "Pick between 1 and 4." },
    ]);
  });

  // Spec scenario: "Cannot skip a category"
  it("refuses fewer than the minimum, including a category sent with nothing", () => {
    const answers = validAnswers();
    answers.picks.seeking = [];
    delete answers.picks.energy;

    expect(validateOnboardingAnswers(answers, catalogue)).toEqual([
      { step: "energy", message: "Pick exactly 1." },
      { step: "seeking", message: "Pick between 1 and 4." },
    ]);
  });

  // Spec scenario: "Invalid answers are rejected by the server" (wrong category)
  it("refuses a tag from another category", () => {
    const answers = validAnswers();
    answers.picks.energy = ["seeking-3"];

    expect(validateOnboardingAnswers(answers, catalogue)).toEqual([
      { step: "energy", message: "That isn't one of the Energy choices." },
    ]);
  });

  // Spec scenario: "Invalid answers are rejected by the server" (retired tag)
  it("refuses a retired or unknown tag", () => {
    const answers = validAnswers();
    // Not in the catalogue, as a retired tag isn't.
    answers.picks.seeking = ["seeking-1", "seeking-retired"];

    expect(validateOnboardingAnswers(answers, catalogue)).toEqual([
      { step: "seeking", message: "That isn't one of the Seeking choices." },
    ]);
  });

  it("refuses the same tag twice", () => {
    const answers = validAnswers();
    answers.picks.seeking = ["seeking-1", "seeking-1"];

    expect(validateOnboardingAnswers(answers, catalogue)).toEqual([
      { step: "seeking", message: "Each tag can only be picked once." },
    ]);
  });

  it("refuses picks for a category that isn't part of onboarding", () => {
    const answers = validAnswers();
    answers.picks["made-up"] = ["made-up-1"];

    expect(validateOnboardingAnswers(answers, catalogue)).toEqual([
      { step: "made-up", message: "That question isn't part of onboarding any more." },
    ]);
  });

  // Spec scenario: "No silhouette chosen"
  it("refuses a missing or unknown silhouette", () => {
    const answers = validAnswers();
    answers.silhouetteId = "";
    expect(validateOnboardingAnswers(answers, catalogue)).toEqual([
      { step: "silhouette", message: "Pick a silhouette." },
    ]);

    answers.silhouetteId = "silhouette-13";
    expect(validateOnboardingAnswers(answers, catalogue)).toHaveLength(1);
  });
});

describe("silhouettes", () => {
  it("has 12, numbered 01 to 12, each with a label", () => {
    expect(SILHOUETTE_IDS).toEqual(
      Array.from({ length: 12 }, (_, index) => `silhouette-${String(index + 1).padStart(2, "0")}`),
    );
    for (const silhouette of SILHOUETTES) {
      expect(silhouette.label.length).toBeGreaterThan(0);
    }
  });

  it("has a picture file for every id", () => {
    for (const id of SILHOUETTE_IDS) {
      // "/silhouettes/x.svg" is served from public/silhouettes/x.svg.
      const file = path.join(process.cwd(), "public", silhouetteUrl(id));
      expect(existsSync(file), `${file} is missing`).toBe(true);
    }
  });
});
