// Tests for who can be scored (slice 3, #10, task 4.1), against the test
// database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { getEligiblePeople } from "@/lib/matching/eligiblePeople";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson } from "../helpers/people";

beforeEach(async () => {
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("getEligiblePeople", () => {
  it("returns only the finished, active person", async () => {
    const finished = await createPerson(prisma, "finished");
    await createPerson(prisma, "unfinished", { finishedAt: null });
    await createPerson(prisma, "suspended", { suspended: true });

    const people = await getEligiblePeople();

    expect(people.map((person) => person.userId)).toEqual([finished]);
  });

  it("groups each person's tags by category", async () => {
    await createPerson(prisma, "anna", {
      tagIds: [
        "hero-story-wildcard",
        "energy-sea-captain",
        "vibe-diagnosis-villain-era",
        "qualities-stays-calm",
        "qualities-goes-deep",
        "seeking-makes-it-real",
      ],
    });

    const [anna] = await getEligiblePeople();

    expect(anna.tags.heroStory).toEqual(["hero-story-wildcard"]);
    expect(anna.tags.energy).toEqual(["energy-sea-captain"]);
    expect(anna.tags.vibeDiagnosis).toEqual(["vibe-diagnosis-villain-era"]);
    expect([...anna.tags.qualities].sort()).toEqual([
      "qualities-goes-deep",
      "qualities-stays-calm",
    ]);
    expect(anna.tags.seeking).toEqual(["seeking-makes-it-real"]);
    // Nobody has Skills or Interests until slice 2 adds them.
    expect(anna.tags.skills).toEqual([]);
    expect(anna.tags.interests).toEqual([]);
  });

  it("returns people in the same order every time and with their finish date", async () => {
    await createPerson(prisma, "zed", { finishedAt: new Date("2026-03-01T00:00:00Z") });
    await createPerson(prisma, "amy", { finishedAt: new Date("2026-02-01T00:00:00Z") });

    const people = await getEligiblePeople();

    expect(people.map((person) => person.userId)).toEqual(["test-user-amy", "test-user-zed"]);
    expect(people[0].completedAt).toEqual(new Date("2026-02-01T00:00:00Z"));
  });
});
