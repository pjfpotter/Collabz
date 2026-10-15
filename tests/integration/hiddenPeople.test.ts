// Tests for "who is hidden from this viewer because of a block" (slice 9,
// #16, task 1.1), against the test database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { getHiddenUserIds } from "@/lib/safety/hiddenPeople";

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

describe("getHiddenUserIds", () => {
  it("is empty when nobody has blocked anybody", async () => {
    const viewer = await createPerson(prisma, "viewer");
    await createPerson(prisma, "anna");

    expect((await getHiddenUserIds(viewer)).size).toBe(0);
  });

  it("hides someone the viewer blocked", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    await prisma.block.create({ data: { blockerId: viewer, blockedId: anna } });

    expect([...(await getHiddenUserIds(viewer))]).toEqual([anna]);
  });

  it("hides someone who blocked the viewer, so the rule works in both directions", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const ben = await createPerson(prisma, "ben");
    await prisma.block.create({ data: { blockerId: ben, blockedId: viewer } });

    expect([...(await getHiddenUserIds(viewer))]).toEqual([ben]);
  });

  it("does not hide anyone from a third person", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    const cara = await createPerson(prisma, "cara");
    await prisma.block.create({ data: { blockerId: anna, blockedId: cara } });

    expect((await getHiddenUserIds(viewer)).size).toBe(0);
    // ...but each of the two does lose the other.
    expect([...(await getHiddenUserIds(anna))]).toEqual([cara]);
    expect([...(await getHiddenUserIds(cara))]).toEqual([anna]);
  });

  it("lists a person once even if both of them blocked each other", async () => {
    const viewer = await createPerson(prisma, "viewer");
    const anna = await createPerson(prisma, "anna");
    await prisma.block.create({ data: { blockerId: viewer, blockedId: anna } });
    await prisma.block.create({ data: { blockerId: anna, blockedId: viewer } });

    expect([...(await getHiddenUserIds(viewer))]).toEqual([anna]);
  });
});
