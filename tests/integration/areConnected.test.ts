// Tests for areConnected, the rule slice 7 uses to decide who may see a photo
// (slice 5, #12, task 5.2), against the test database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { areConnected } from "@/lib/requests/areConnected";

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

async function makePair() {
  const anna = await createPerson(prisma, "anna");
  const ben = await createPerson(prisma, "ben");
  return { anna, ben };
}

describe("areConnected", () => {
  it("is true for an approved request, whichever way round it is asked", async () => {
    const { anna, ben } = await makePair();
    await prisma.connectionRequest.create({
      data: { fromUserId: anna, toUserId: ben, status: "APPROVED" },
    });

    expect(await areConnected(anna, ben)).toBe(true);
    expect(await areConnected(ben, anna)).toBe(true);
  });

  it("is false for a pending request, a declined one, and no request at all", async () => {
    const { anna, ben } = await makePair();
    expect(await areConnected(anna, ben)).toBe(false);

    const request = await prisma.connectionRequest.create({
      data: { fromUserId: anna, toUserId: ben, status: "PENDING" },
    });
    expect(await areConnected(anna, ben)).toBe(false);

    await prisma.connectionRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED" },
    });
    expect(await areConnected(anna, ben)).toBe(false);
  });

  it("is false once either person blocks the other", async () => {
    const { anna, ben } = await makePair();
    await prisma.connectionRequest.create({
      data: { fromUserId: anna, toUserId: ben, status: "APPROVED" },
    });
    expect(await areConnected(anna, ben)).toBe(true);

    await prisma.block.create({ data: { blockerId: ben, blockedId: anna } });

    expect(await areConnected(anna, ben)).toBe(false);
    expect(await areConnected(ben, anna)).toBe(false);
  });

  it("is false when the blocker is the one who sent the request", async () => {
    const { anna, ben } = await makePair();
    await prisma.connectionRequest.create({
      data: { fromUserId: anna, toUserId: ben, status: "APPROVED" },
    });
    await prisma.block.create({ data: { blockerId: anna, blockedId: ben } });

    expect(await areConnected(anna, ben)).toBe(false);
  });

  it("is false for the same person twice, and for someone unconnected to a third person", async () => {
    const { anna, ben } = await makePair();
    const cara = await createPerson(prisma, "cara");
    await prisma.connectionRequest.create({
      data: { fromUserId: anna, toUserId: ben, status: "APPROVED" },
    });

    expect(await areConnected(anna, anna)).toBe(false);
    expect(await areConnected(anna, cara)).toBe(false);
  });
});
