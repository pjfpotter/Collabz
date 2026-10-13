// Tests for explainMatch (slice 3, #10, task 5.2), against the test database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { explainMatch, scoreUser } from "@/lib/matching";
import { orderUserPair } from "@/lib/userPair";

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

// Two people with a known mix of reasons: Anna seeks what Ben offers, they
// share an Energy, and their Hero Stories differ.
async function makeAnnaAndBen() {
  const anna = await createPerson(prisma, "anna", {
    tagIds: [
      "hero-story-wildcard",
      "energy-sea-captain",
      "vibe-diagnosis-main-character",
      "seeking-finishes-what-i-start",
    ],
  });
  const ben = await createPerson(prisma, "ben", {
    tagIds: [
      "hero-story-outsider",
      "energy-sea-captain",
      "vibe-diagnosis-villain-era",
      "qualities-finishes-the-thing",
    ],
  });
  return { anna, ben };
}

async function storedScore(firstUserId: string, secondUserId: string): Promise<number> {
  const edge = await prisma.edge.findUniqueOrThrow({
    where: { userAId_userBId: orderUserPair(firstUserId, secondUserId) },
  });
  return edge.score;
}

describe("explainMatch", () => {
  it("explains a pair, and its score is the one stored for them", async () => {
    const { anna, ben } = await makeAnnaAndBen();
    await scoreUser(anna);
    await scoreUser(ben);

    const explanation = await explainMatch(anna, ben);

    // complement 1 (x3) + same Energy 1 + different Hero Story 1 = 5
    expect(explanation).not.toBeNull();
    expect(explanation?.score).toBe(5);
    expect(explanation?.score).toBe(await storedScore(anna, ben));
    expect(explanation?.sentences).toEqual([
      `You're looking for "Someone who finishes what I start", and they bring "Actually finishes the thing".`,
      `You both picked the same Energy: "Giving Sea Captain Energy".`,
      "Your Hero Stories are different, which adds some spark.",
    ]);
    // The reasons add up to the number.
    const total = explanation?.reasons.reduce((sum, reason) => sum + reason.points, 0);
    expect(total).toBe(5);
  });

  it("speaks from the viewer's side: the other way round says 'they're looking for'", async () => {
    const { anna, ben } = await makeAnnaAndBen();

    const fromBen = await explainMatch(ben, anna);

    expect(fromBen?.sentences[0]).toBe(
      `They're looking for "Someone who finishes what I start", and you bring "Actually finishes the thing".`,
    );
    expect(fromBen?.score).toBe(5);
  });

  it("lists shared Skills and Interests, and they do not change the score", async () => {
    // Skills and Interests arrive with slice 2, so this test creates them.
    await prisma.category.create({
      data: { id: "skills", name: "Skills", pickMin: 0, pickMax: 4, order: 90 },
    });
    await prisma.category.create({
      data: { id: "interests", name: "Interests", pickMin: 0, pickMax: 4, order: 91 },
    });
    await prisma.tag.create({
      data: { id: "skills-coding", categoryId: "skills", name: "Coding", description: "", order: 1 },
    });
    await prisma.tag.create({
      data: {
        id: "interests-music",
        categoryId: "interests",
        name: "Music",
        description: "",
        order: 1,
      },
    });
    const { anna, ben } = await makeAnnaAndBen();

    const withoutShared = await explainMatch(anna, ben);
    await prisma.profileTag.createMany({
      data: [
        { userId: anna, tagId: "skills-coding" },
        { userId: ben, tagId: "skills-coding" },
        { userId: anna, tagId: "interests-music" },
        { userId: ben, tagId: "interests-music" },
      ],
    });
    const withShared = await explainMatch(anna, ben);

    expect(withoutShared?.sharedSkills).toEqual([]);
    expect(withShared?.sharedSkills).toEqual(["Coding"]);
    expect(withShared?.sharedInterests).toEqual(["Music"]);
    // Shown for information only: the number and the reasons are unchanged.
    expect(withShared?.score).toBe(withoutShared?.score);
    expect(withShared?.sentences).toEqual(withoutShared?.sentences);
  });

  it("returns null for the same person, an unfinished profile or a suspended user", async () => {
    const { anna, ben } = await makeAnnaAndBen();
    const unfinished = await createPerson(prisma, "unfinished", { finishedAt: null });
    const suspended = await createPerson(prisma, "suspended", { suspended: true });

    expect(await explainMatch(anna, anna)).toBeNull();
    expect(await explainMatch(anna, unfinished)).toBeNull();
    expect(await explainMatch(unfinished, anna)).toBeNull();
    expect(await explainMatch(ben, suspended)).toBeNull();
  });
});
