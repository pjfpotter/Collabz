// Tests for "Rescore everyone" (slice 8, #15, task 2.4) against the real test
// database: a pairing change alone leaves scores, the button applies it.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { setTagPairings } from "@/lib/admin/pairings";
import { rescoreEveryoneNow } from "@/lib/admin/rescoreEveryone";
import { prisma } from "@/lib/db";

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

describe("rescoreEveryoneNow", () => {
  it("leaves scores alone after a pairing change until it is run", async () => {
    // Anna seeks "makes it real"; Ben has "knows someone", which the seed
    // does NOT pair with it, so they start with no complement.
    const anna = await createPerson(prisma, "anna", { tagIds: ["seeking-makes-it-real"] });
    const ben = await createPerson(prisma, "ben", { tagIds: ["qualities-knows-someone"] });

    expect(await rescoreEveryoneNow()).toBe(2);
    const before = await prisma.edge.findMany();
    expect(before).toHaveLength(1);
    expect(before[0].complement).toBe(0);

    // The admin pairs the two tags. Nothing is recalculated yet.
    expect(
      await setTagPairings("seeking-makes-it-real", [
        "qualities-builds-with-hands",
        "qualities-knows-someone",
      ]),
    ).toEqual([]);
    expect(await prisma.edge.findMany()).toEqual(before);

    // Pressing the button applies the new pairing.
    expect(await rescoreEveryoneNow()).toBe(2);
    const after = await prisma.edge.findMany();
    expect(after).toHaveLength(1);
    expect(after[0].complement).toBe(1);
    expect(after[0].score).toBe(3);
    expect([after[0].userAId, after[0].userBId].sort()).toEqual([anna, ben].sort());
  });

  it("does not count suspended or unfinished people", async () => {
    await createPerson(prisma, "anna");
    await createPerson(prisma, "ben");
    await createPerson(prisma, "cara", { suspended: true });
    await createPerson(prisma, "dev", { finishedAt: null });

    expect(await rescoreEveryoneNow()).toBe(2);
  });
});
