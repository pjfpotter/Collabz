// Tests for the graph demo's invented cohort (graph-demo, task 1.2).
//
// The cohort is plain data, so these tests are really "does this data still
// fit the catalogue?" checks. They need no database. If an admin-style change
// to prisma/seed-data.ts removes a tag the demo uses, the first test fails and
// names the tag, instead of the demo quietly scoring against a tag that no
// longer exists.

import { describe, expect, it } from "vitest";

import { seedCategories, seedCourses } from "../../prisma/seed-data";
import { baseAlias } from "@/lib/profile/alias";
import { DEMO_COHORT, type DemoPerson } from "@/lib/graphDemo/demoCohort";

// The catalogue as lookups: category id -> its tags and pick limits.
const categoryById = new Map(seedCategories.map((category) => [category.id, category]));

// Which DemoPerson field belongs to which catalogue category.
const FIELD_TO_CATEGORY: [keyof DemoPerson, string][] = [
  ["heroStory", "hero-story"],
  ["energy", "energy"],
  ["vibeDiagnosis", "vibe-diagnosis"],
  ["qualities", "qualities"],
  ["seeking", "seeking"],
];

describe("DEMO_COHORT", () => {
  it("has about forty people", () => {
    expect(DEMO_COHORT.length).toBeGreaterThanOrEqual(36);
    expect(DEMO_COHORT.length).toBeLessThanOrEqual(44);
  });

  it("uses only tag ids that exist in the catalogue, in the right category", () => {
    for (const person of DEMO_COHORT) {
      for (const [field, categoryId] of FIELD_TO_CATEGORY) {
        const category = categoryById.get(categoryId);
        const validIds = new Set(category?.tags.map((tag) => tag.id));
        for (const tagId of person[field] as string[]) {
          expect(validIds.has(tagId), `${person.alias}: ${tagId} is not in ${categoryId}`).toBe(
            true,
          );
        }
      }
    }
  });

  it("stays inside the same pick limits as onboarding", () => {
    for (const person of DEMO_COHORT) {
      for (const [field, categoryId] of FIELD_TO_CATEGORY) {
        const category = categoryById.get(categoryId);
        const count = (person[field] as string[]).length;
        expect(count, `${person.alias}: ${field}`).toBeGreaterThanOrEqual(category!.pickMin);
        expect(count, `${person.alias}: ${field}`).toBeLessThanOrEqual(category!.pickMax);
      }
    }
  });

  it("never has the word Pretend in a name", () => {
    for (const person of DEMO_COHORT) {
      expect(person.alias.toLowerCase()).not.toContain("pretend");
      expect(person.id.toLowerCase()).not.toContain("pretend");
    }
  });

  it("gives every person the alias the real rule would give them", () => {
    // The real rule: "The" + Vibe alias word + Energy alias word.
    const tagById = new Map(
      seedCategories.flatMap((category) => category.tags.map((tag) => [tag.id, tag] as const)),
    );
    for (const person of DEMO_COHORT) {
      const vibeWord = tagById.get(person.vibeDiagnosis[0])?.aliasWord;
      const energyWord = tagById.get(person.energy[0])?.aliasWord;
      expect(person.alias).toBe(baseAlias(vibeWord, energyWord));
    }
  });

  it("has no two people with the same alias or the same id", () => {
    expect(new Set(DEMO_COHORT.map((person) => person.alias)).size).toBe(DEMO_COHORT.length);
    expect(new Set(DEMO_COHORT.map((person) => person.id)).size).toBe(DEMO_COHORT.length);
  });

  it("covers both courses", () => {
    const courseIds = new Set(seedCourses.map((course) => course.id));
    const used = new Set(DEMO_COHORT.map((person) => person.course));
    for (const courseId of courseIds) {
      expect(used.has(courseId as "software" | "business")).toBe(true);
    }
  });

  it("only uses silhouettes that have a file", () => {
    for (const person of DEMO_COHORT) {
      expect(person.silhouette).toMatch(/^silhouette-(0[1-9]|1[0-2])$/);
    }
  });
});
