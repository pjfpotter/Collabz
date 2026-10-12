// Tests for getTopFive (slice 3, #10, task 5.1), against the test database.
//
// Scores are set by hand with createScore, so the expected order can be read
// straight off each test without running the formula.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { getTopFive } from "@/lib/matching";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson, createScore } from "../helpers/people";

beforeEach(async () => {
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("getTopFive", () => {
  it("ranks by score, highest first, and returns at most five", async () => {
    const me = await createPerson(prisma, "me");
    const scores = [2, 9, 4, 7, 1, 8, 5];
    const others: string[] = [];
    for (const [index, score] of scores.entries()) {
      const id = await createPerson(prisma, `p${index}`);
      await createScore(prisma, me, id, score);
      others.push(id);
    }

    const top = await getTopFive(me);

    // Scores 9, 8, 7, 5, 4: persons 1, 5, 3, 6, 2.
    expect(top).toEqual([
      { userId: others[1], score: 9 },
      { userId: others[5], score: 8 },
      { userId: others[3], score: 7 },
      { userId: others[6], score: 5 },
      { userId: others[2], score: 4 },
    ]);
  });

  it("puts the earlier finisher first when scores are equal, and is stable", async () => {
    const me = await createPerson(prisma, "me");
    // "aaa" sorts first by id, but "zzz" finished earlier.
    const aaa = await createPerson(prisma, "aaa", { finishedAt: new Date("2026-02-01T00:00:00Z") });
    const zzz = await createPerson(prisma, "zzz", { finishedAt: new Date("2026-01-01T00:00:00Z") });
    await createScore(prisma, me, aaa, 5);
    await createScore(prisma, me, zzz, 5);

    const first = await getTopFive(me);
    const second = await getTopFive(me);

    expect(first.map((match) => match.userId)).toEqual([zzz, aaa]);
    expect(second).toEqual(first);
  });

  it("falls back to the lower user id when score and finish time are equal", async () => {
    const me = await createPerson(prisma, "me");
    const b = await createPerson(prisma, "b");
    const a = await createPerson(prisma, "a");
    // Created in the "wrong" order on purpose.
    await createScore(prisma, me, b, 5);
    await createScore(prisma, me, a, 5);

    const top = await getTopFive(me);

    expect(top.map((match) => match.userId)).toEqual([a, b]);
  });

  it("leaves out suspended and unfinished people, however high they score", async () => {
    const me = await createPerson(prisma, "me");
    const ok = await createPerson(prisma, "ok");
    const suspended = await createPerson(prisma, "suspended", { suspended: true });
    const unfinished = await createPerson(prisma, "unfinished", { finishedAt: null });
    await createScore(prisma, me, ok, 1);
    await createScore(prisma, me, suspended, 99);
    await createScore(prisma, me, unfinished, 98);

    const top = await getTopFive(me);

    expect(top).toEqual([{ userId: ok, score: 1 }]);
  });

  it("lists fewer than five when fewer people are available", async () => {
    const me = await createPerson(prisma, "me");
    const a = await createPerson(prisma, "a");
    const b = await createPerson(prisma, "b");
    await createScore(prisma, me, a, 3);
    await createScore(prisma, me, b, 6);

    const top = await getTopFive(me);

    expect(top.map((match) => match.userId)).toEqual([b, a]);
  });

  it("finds a match whichever side of the stored pair the user is on", async () => {
    // Both orderings: createScore puts the lower id first, so with ids "a" and
    // "z" each person sees the same pair from a different side.
    const a = await createPerson(prisma, "a");
    const z = await createPerson(prisma, "z");
    await createScore(prisma, a, z, 4);

    expect(await getTopFive(a)).toEqual([{ userId: z, score: 4 }]);
    expect(await getTopFive(z)).toEqual([{ userId: a, score: 4 }]);
  });

  it("gives an unfinished or suspended user an empty list", async () => {
    const ok = await createPerson(prisma, "ok");
    const unfinished = await createPerson(prisma, "unfinished", { finishedAt: null });
    await createScore(prisma, ok, unfinished, 5);

    expect(await getTopFive(unfinished)).toEqual([]);
  });
});
