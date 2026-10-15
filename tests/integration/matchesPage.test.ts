// Tests for what the /matches page may show (slice 3, #10, task 6.1),
// against the test database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { scoreUser } from "@/lib/matching";
import { getMatchesPage } from "@/lib/matching/matchesPage";

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

const SEEKING = ["seeking-stays-when-hard", "seeking-finishes-what-i-start", "seeking-makes-it-real"];
const QUALITIES = ["qualities-stays-calm", "qualities-finishes-the-thing", "qualities-builds-with-hands"];
const ENERGIES = ["energy-sea-captain", "energy-feral-gremlin"];

async function makeScoredCohort(count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let index = 0; index < count; index++) {
    ids.push(
      await createPerson(prisma, `p${index}`, {
        finishedAt: new Date(Date.UTC(2026, 0, 1 + index)),
        tagIds: [
          "hero-story-wildcard",
          ENERGIES[index % ENERGIES.length],
          QUALITIES[index % QUALITIES.length],
          SEEKING[(index + 1) % SEEKING.length],
        ],
      }),
    );
  }
  for (const id of ids) {
    await scoreUser(id);
  }
  return ids;
}

describe("getMatchesPage", () => {
  it("returns five matches best first, and a glitch match that is not one of them", async () => {
    const [viewer] = await makeScoredCohort(9);

    const page = await getMatchesPage(viewer);

    expect(page.topFive).toHaveLength(5);
    const scores = page.topFive.map((card) => card.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));

    expect(page.glitch).not.toBeNull();
    const topAddresses = page.topFive.map((card) => card.address);
    expect(topAddresses).not.toContain(page.glitch?.address);
    // Never yourself.
    const me = await prisma.profile.findUniqueOrThrow({ where: { userId: viewer } });
    expect(page.topFive.map((card) => card.alias)).not.toContain(me.alias);
    expect(page.glitch?.alias).not.toBe(me.alias);
  });

  it("gives every card a score and at least one reason sentence", async () => {
    const [viewer] = await makeScoredCohort(9);

    const page = await getMatchesPage(viewer);

    for (const card of [...page.topFive, ...(page.glitch ? [page.glitch] : [])]) {
      expect(Number.isInteger(card.score)).toBe(true);
      expect(card.sentences.length).toBeGreaterThan(0);
    }
  });

  it("contains nothing but alias, silhouette, course, address, score and reasons: no email, no user id", async () => {
    const [viewer] = await makeScoredCohort(9);

    const page = await getMatchesPage(viewer);

    const card = page.topFive[0];
    expect(Object.keys(card).sort()).toEqual([
      "address",
      "alias",
      "courseId",
      "courseName",
      "score",
      "sentences",
      "sharedInterests",
      "sharedSkills",
      "silhouette",
    ]);
    const everything = JSON.stringify(page);
    expect(everything).not.toContain("@");
    expect(everything).not.toContain("test-user-");
  });

  it("is the same on a second load, glitch match included", async () => {
    const [viewer] = await makeScoredCohort(9);

    const first = await getMatchesPage(viewer);
    const second = await getMatchesPage(viewer);

    expect(second).toEqual(first);
  });

  it("lists who there is, with no glitch match, when the cohort is small", async () => {
    const [viewer] = await makeScoredCohort(3);

    const page = await getMatchesPage(viewer);

    expect(page.topFive).toHaveLength(2);
    expect(page.glitch).toBeNull();
  });

  it("is empty for the only person who has finished", async () => {
    const [viewer] = await makeScoredCohort(1);

    expect(await getMatchesPage(viewer)).toEqual({ topFive: [], glitch: null });
  });
});
